<?php

namespace Tests\Feature;

use App\Mail\SubmissionAcceptedMail;
use App\Mail\SubmissionRejectedMail;
use App\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Create admin user
        $this->admin = User::factory()->create([
            'is_admin' => true,
        ]);

        // Create regular user
        $this->regularUser = User::factory()->create([
            'is_admin' => false,
        ]);

        Mail::fake();
    }

    public function test_accept_submission_works_with_auth_user(): void
    {
        // Create a submitted thread
        $thread = Thread::factory()->create([
            'user_id' => $this->regularUser->id,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // Make request as admin
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/submissions/{$thread->id}/accept", [
                'notes' => 'Great submission!',
            ]);

        $response->assertOk();
        $response->assertJson(['message' => 'Submission accepted']);

        // Verify thread was accepted
        $this->assertDatabaseHas('threads', [
            'id' => $thread->id,
            'status' => 'accepted',
        ]);

        // Verify submission event was created with correct admin
        $this->assertDatabaseHas('submission_events', [
            'thread_id' => $thread->id,
            'admin_id' => $this->admin->id,
            'event_type' => 'accepted',
            'notes' => 'Great submission!',
        ]);

        // Verify acceptance email was sent
        Mail::assertSent(SubmissionAcceptedMail::class, function ($mail) use ($thread) {
            return $mail->hasTo($this->regularUser->email);
        });
    }

    public function test_reject_submission_works_with_auth_user(): void
    {
        // Create a submitted thread
        $thread = Thread::factory()->create([
            'user_id' => $this->regularUser->id,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // Make request as admin
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/submissions/{$thread->id}/reject", [
                'notes' => 'Needs improvement',
            ]);

        $response->assertOk();
        $response->assertJson(['message' => 'Submission rejected']);

        // Verify thread was rejected
        $this->assertDatabaseHas('threads', [
            'id' => $thread->id,
            'status' => 'rejected',
        ]);

        // Verify submission event was created with correct admin
        $this->assertDatabaseHas('submission_events', [
            'thread_id' => $thread->id,
            'admin_id' => $this->admin->id,
            'event_type' => 'rejected',
            'notes' => 'Needs improvement',
        ]);

        // Verify rejection email was sent
        Mail::assertSent(SubmissionRejectedMail::class, function ($mail) use ($thread) {
            return $mail->hasTo($this->regularUser->email);
        });
    }

    public function test_publish_submission_works_with_auth_user(): void
    {
        // Create an accepted thread
        $thread = Thread::factory()->create([
            'user_id' => $this->regularUser->id,
            'status' => 'accepted',
            'submitted_at' => now(),
        ]);

        // Make request as admin
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/submissions/{$thread->id}/publish");

        $response->assertOk();
        $response->assertJson(['message' => 'Piece published']);

        // Verify thread was published
        $this->assertDatabaseHas('threads', [
            'id' => $thread->id,
            'status' => 'published',
        ]);

        // Verify submission event was created with correct admin
        $this->assertDatabaseHas('submission_events', [
            'thread_id' => $thread->id,
            'admin_id' => $this->admin->id,
            'event_type' => 'published',
        ]);

        // Verify published_at is set
        $thread->refresh();
        $this->assertNotNull($thread->published_at);
    }

    public function test_non_admin_cannot_access_admin_routes(): void
    {
        $thread = Thread::factory()->create([
            'user_id' => $this->regularUser->id,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // Try to accept as non-admin
        $response = $this->actingAs($this->regularUser, 'sanctum')
            ->postJson("/api/admin/submissions/{$thread->id}/accept");

        $response->assertForbidden();
    }

    public function test_unauthenticated_user_cannot_access_admin_routes(): void
    {
        $thread = Thread::factory()->create([
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // Try to accept without authentication
        $response = $this->postJson("/api/admin/submissions/{$thread->id}/accept");

        $response->assertUnauthorized();
    }

    public function test_cannot_accept_non_submitted_thread(): void
    {
        $thread = Thread::factory()->create([
            'user_id' => $this->regularUser->id,
            'status' => 'rejected',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/submissions/{$thread->id}/accept");

        $response->assertStatus(422);
        $response->assertJson(['error' => 'Can only accept submitted pieces']);
    }

    public function test_cannot_reject_non_submitted_thread(): void
    {
        $thread = Thread::factory()->create([
            'user_id' => $this->regularUser->id,
            'status' => 'rejected',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/submissions/{$thread->id}/reject");

        $response->assertStatus(422);
        $response->assertJson(['error' => 'Can only reject submitted pieces']);
    }

    public function test_cannot_publish_non_accepted_thread(): void
    {
        $thread = Thread::factory()->create([
            'user_id' => $this->regularUser->id,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/submissions/{$thread->id}/publish");

        $response->assertStatus(422);
        $response->assertJson(['error' => 'Can only publish accepted submissions']);
    }

    public function test_list_submissions(): void
    {
        // Create submitted and accepted threads (both should appear)
        Thread::factory()->create([
            'user_id' => $this->regularUser->id,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        Thread::factory()->create([
            'user_id' => $this->regularUser->id,
            'status' => 'accepted',
            'submitted_at' => now(),
        ]);

        // Create a rejected thread (should not appear)
        Thread::factory()->create([
            'user_id' => $this->regularUser->id,
            'status' => 'rejected',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/submissions');

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
        $response->assertJsonStructure([
            'data' => [['id', 'name', 'status', 'submitted_at', 'author', 'messages']],
            'meta' => ['current_page', 'last_page', 'per_page', 'total'],
        ]);
    }

    public function test_show_submission(): void
    {
        $thread = Thread::factory()->create([
            'user_id' => $this->regularUser->id,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/submissions/{$thread->id}");

        $response->assertOk();
        $response->assertJsonFragment(['id' => $thread->id]);
    }

    public function test_show_accepted_submission(): void
    {
        $thread = Thread::factory()->create([
            'user_id' => $this->regularUser->id,
            'status' => 'accepted',
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/submissions/{$thread->id}");

        $response->assertOk();
        $response->assertJsonFragment(['id' => $thread->id]);
    }

    public function test_show_submission_returns_404_for_rejected(): void
    {
        $thread = Thread::factory()->create([
            'user_id' => $this->regularUser->id,
            'status' => 'rejected',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/submissions/{$thread->id}");

        $response->assertNotFound();
        $response->assertJson(['error' => 'Submission not found']);
    }
}
