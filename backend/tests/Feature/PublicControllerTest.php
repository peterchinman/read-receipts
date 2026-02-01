<?php

namespace Tests\Feature;

use App\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_only_published_threads(): void
    {
        $user = User::factory()->create();

        $published = Thread::factory()->create([
            'user_id' => $user->id,
            'status' => 'published',
            'published_at' => now(),
        ]);

        // These should not appear
        Thread::factory()->create([
            'user_id' => $user->id,
            'status' => 'rejected',
        ]);
        Thread::factory()->create([
            'user_id' => $user->id,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $response = $this->getJson('/api/published');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['id' => $published->id]);
        $response->assertJsonStructure([
            'data' => [['id', 'name', 'published_at', 'author', 'messages']],
            'meta' => ['current_page', 'last_page', 'per_page', 'total'],
        ]);
    }

    public function test_show_published_thread(): void
    {
        $user = User::factory()->create();
        $thread = Thread::factory()->create([
            'user_id' => $user->id,
            'status' => 'published',
            'published_at' => now(),
        ]);

        $response = $this->getJson("/api/published/{$thread->id}");

        $response->assertOk();
        $response->assertJsonFragment(['id' => $thread->id]);
    }

    public function test_show_returns_404_for_non_published_thread(): void
    {
        $user = User::factory()->create();
        $thread = Thread::factory()->create([
            'user_id' => $user->id,
            'status' => 'submitted',
        ]);

        $response = $this->getJson("/api/published/{$thread->id}");

        $response->assertNotFound();
        $response->assertJson(['error' => 'Thread not found']);
    }

    public function test_public_endpoints_do_not_require_authentication(): void
    {
        $response = $this->getJson('/api/published');

        $response->assertOk();
    }

    public function test_author_does_not_expose_email(): void
    {
        $user = User::factory()->create(['email' => 'secret@example.com']);
        $thread = Thread::factory()->create([
            'user_id' => $user->id,
            'status' => 'published',
            'published_at' => now(),
        ]);

        $response = $this->getJson("/api/published/{$thread->id}");

        $response->assertOk();
        $response->assertJsonMissing(['email' => 'secret@example.com']);
    }
}
