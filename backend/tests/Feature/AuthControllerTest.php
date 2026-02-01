<?php

namespace Tests\Feature;

use App\Mail\MagicLinkMail;
use App\Models\AuthToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    public function test_request_magic_link_creates_user_and_sends_email(): void
    {
        $response = $this->postJson('/api/auth/magic-link', [
            'email' => 'newuser@example.com',
        ]);

        $response->assertOk();
        $response->assertJson(['message' => 'Magic link sent to your email']);

        $this->assertDatabaseHas('users', ['email' => 'newuser@example.com']);
        $this->assertDatabaseHas('auth_tokens', [
            'user_id' => User::where('email', 'newuser@example.com')->first()->id,
        ]);

        Mail::assertSent(MagicLinkMail::class, function ($mail) {
            return $mail->hasTo('newuser@example.com');
        });
    }

    public function test_request_magic_link_reuses_existing_user(): void
    {
        $user = User::factory()->create(['email' => 'existing@example.com']);

        $response = $this->postJson('/api/auth/magic-link', [
            'email' => 'existing@example.com',
        ]);

        $response->assertOk();
        $this->assertCount(1, User::where('email', 'existing@example.com')->get());
    }

    public function test_request_magic_link_requires_valid_email(): void
    {
        $response = $this->postJson('/api/auth/magic-link', [
            'email' => 'not-an-email',
        ]);

        $response->assertUnprocessable();
    }

    public function test_verify_valid_token(): void
    {
        $user = User::factory()->create();
        $authToken = AuthToken::generateFor($user);

        $response = $this->getJson("/api/auth/verify/{$authToken->token}");

        $response->assertOk();
        $response->assertJsonStructure(['user' => ['id', 'email', 'name', 'is_admin'], 'token']);
        $response->assertJsonFragment(['id' => $user->id]);

        // Token should be marked as used
        $authToken->refresh();
        $this->assertNotNull($authToken->used_at);

        // User should be email-verified
        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_verify_expired_token(): void
    {
        $user = User::factory()->create();
        $authToken = AuthToken::generateFor($user);
        $authToken->update(['expires_at' => now()->subMinute()]);

        $response = $this->getJson("/api/auth/verify/{$authToken->token}");

        $response->assertUnauthorized();
        $response->assertJson(['error' => 'Invalid or expired token']);
    }

    public function test_verify_already_used_token(): void
    {
        $user = User::factory()->create();
        $authToken = AuthToken::generateFor($user);
        $authToken->markAsUsed();

        $response = $this->getJson("/api/auth/verify/{$authToken->token}");

        $response->assertUnauthorized();
        $response->assertJson(['error' => 'Invalid or expired token']);
    }

    public function test_verify_nonexistent_token(): void
    {
        $response = $this->getJson('/api/auth/verify/bogus-token');

        $response->assertUnauthorized();
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/me');

        $response->assertOk();
        $response->assertJsonFragment(['id' => $user->id, 'email' => $user->email]);
    }

    public function test_me_requires_authentication(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertUnauthorized();
    }

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('auth-token');

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token->plainTextToken}",
        ])->postJson('/api/auth/logout');

        $response->assertOk();
        $response->assertJson(['message' => 'Logged out successfully']);

        // Token record should be deleted
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $token->accessToken->id,
        ]);
    }
}
