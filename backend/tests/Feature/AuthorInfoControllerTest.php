<?php

namespace Tests\Feature;

use App\Models\AuthorInfo;
use App\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthorInfoControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected string $token;
    protected Thread $acceptedThread;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->token = Str::random(64);

        $this->acceptedThread = Thread::factory()->create([
            'user_id' => $this->user->id,
            'status' => 'accepted',
            'author_info_token' => $this->token,
        ]);
    }

    // --- show (GET) ---

    public function test_show_returns_thread_data_for_accepted_thread(): void
    {
        $response = $this->getJson("/api/author-info/{$this->acceptedThread->id}?token={$this->token}");

        $response->assertOk();
        $response->assertJsonFragment(['id' => $this->acceptedThread->id]);
    }

    public function test_show_returns_403_for_published_thread(): void
    {
        $thread = Thread::factory()->create([
            'user_id' => $this->user->id,
            'status' => 'published',
            'author_info_token' => $this->token,
        ]);

        $response = $this->getJson("/api/author-info/{$thread->id}?token={$this->token}");

        $response->assertForbidden();
    }

    public function test_show_returns_403_with_wrong_token(): void
    {
        $response = $this->getJson("/api/author-info/{$this->acceptedThread->id}?token=wrongtoken");

        $response->assertForbidden();
    }

    public function test_show_returns_403_with_no_token(): void
    {
        $response = $this->getJson("/api/author-info/{$this->acceptedThread->id}");

        $response->assertForbidden();
    }

    public function test_show_returns_existing_author_info_when_already_submitted(): void
    {
        AuthorInfo::create([
            'thread_id' => $this->acceptedThread->id,
            'payment_platform' => 'Venmo',
            'payment_username' => '@existing',
            'name' => 'Existing Name',
            'bio' => 'Existing bio.',
            'link' => null,
        ]);

        $response = $this->getJson("/api/author-info/{$this->acceptedThread->id}?token={$this->token}");

        $response->assertOk();
        $response->assertJsonPath('existing.payment_platform', 'Venmo');
        $response->assertJsonPath('existing.name', 'Existing Name');
    }

    public function test_show_prepopulates_from_previous_piece_when_no_existing_info(): void
    {
        $previousThread = Thread::factory()->create([
            'user_id' => $this->user->id,
            'status' => 'published',
        ]);

        AuthorInfo::create([
            'thread_id' => $previousThread->id,
            'payment_platform' => 'PayPal',
            'payment_username' => 'previous@user.com',
            'name' => 'Previous Name',
            'bio' => 'Previous bio.',
            'link' => 'https://example.com',
        ]);

        $response = $this->getJson("/api/author-info/{$this->acceptedThread->id}?token={$this->token}");

        $response->assertOk();
        $response->assertJsonPath('existing.payment_platform', 'PayPal');
        $response->assertJsonPath('existing.name', 'Previous Name');
        $response->assertJsonPath('existing.bio', 'Previous bio.');
    }

    public function test_show_does_not_prepopulate_from_another_users_piece(): void
    {
        $otherUser = User::factory()->create();
        $otherThread = Thread::factory()->create([
            'user_id' => $otherUser->id,
            'status' => 'published',
        ]);

        AuthorInfo::create([
            'thread_id' => $otherThread->id,
            'payment_platform' => 'Venmo',
            'payment_username' => '@other',
            'name' => 'Other User',
            'bio' => null,
            'link' => null,
        ]);

        $response = $this->getJson("/api/author-info/{$this->acceptedThread->id}?token={$this->token}");

        $response->assertOk();
        $response->assertJsonPath('existing', null);
    }

    // --- store (POST) ---

    public function test_store_saves_author_info_for_accepted_thread(): void
    {
        $response = $this->postJson("/api/author-info/{$this->acceptedThread->id}?token={$this->token}", [
            'payment_platform' => 'Venmo',
            'payment_username' => '@testuser',
            'name' => 'Test Author',
            'bio' => 'A short bio.',
            'link' => 'https://example.com',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('author_infos', [
            'thread_id' => $this->acceptedThread->id,
            'payment_platform' => 'Venmo',
            'payment_username' => '@testuser',
        ]);
    }

    public function test_store_returns_403_for_published_thread(): void
    {
        $thread = Thread::factory()->create([
            'user_id' => $this->user->id,
            'status' => 'published',
            'author_info_token' => $this->token,
        ]);

        $response = $this->postJson("/api/author-info/{$thread->id}?token={$this->token}", [
            'payment_platform' => 'Venmo',
            'payment_username' => '@testuser',
        ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('author_infos', ['thread_id' => $thread->id]);
    }

    public function test_store_returns_403_with_wrong_token(): void
    {
        $response = $this->postJson("/api/author-info/{$this->acceptedThread->id}?token=wrongtoken", [
            'payment_platform' => 'Venmo',
            'payment_username' => '@testuser',
        ]);

        $response->assertForbidden();
    }

    public function test_store_requires_payment_platform_and_username(): void
    {
        $response = $this->postJson("/api/author-info/{$this->acceptedThread->id}?token={$this->token}", [
            'name' => 'Test Author',
        ]);

        $response->assertUnprocessable();
    }
}
