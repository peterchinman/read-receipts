<?php

namespace Tests\Feature;

use App\Models\Thread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThreadControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_submit_with_valid_payload(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/submit', [
                'name' => 'My Thread',
                'recipient_name' => 'Alice',
                'recipient_location' => 'New York, NY',
                'messages' => [
                    ['sender' => 'self', 'message' => 'Hello'],
                    ['sender' => 'other', 'message' => 'Hi back'],
                ],
            ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['message', 'id']);

        $this->assertDatabaseHas('threads', [
            'user_id' => $this->user->id,
            'name' => 'My Thread',
            'recipient_name' => 'Alice',
            'recipient_location' => 'New York, NY',
            'status' => 'submitted',
        ]);

        $thread = Thread::find($response->json('id'));
        $this->assertCount(2, $thread->messages);
        $this->assertEquals('self', $thread->messages[0]['sender']);
        $this->assertEquals('Hello', $thread->messages[0]['message']);
        $this->assertEquals(0, $thread->messages[0]['position']);
        $this->assertEquals('other', $thread->messages[1]['sender']);
        $this->assertEquals('Hi back', $thread->messages[1]['message']);
        $this->assertEquals(1, $thread->messages[1]['position']);

        $this->assertDatabaseHas('submission_events', [
            'thread_id' => $thread->id,
            'event_type' => 'submitted',
        ]);
    }

    public function test_submit_requires_authentication(): void
    {
        $response = $this->postJson('/api/submit', [
            'messages' => [
                ['sender' => 'self', 'message' => 'Hello'],
            ],
        ]);

        $response->assertUnauthorized();
    }

    public function test_submit_requires_messages(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/submit', [
                'name' => 'No Messages',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('messages');
    }

    public function test_submit_validates_sender_values(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/submit', [
                'messages' => [
                    ['sender' => 'invalid', 'message' => 'Hello'],
                ],
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('messages.0.sender');
    }

    public function test_submit_with_optional_fields_only(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/submit', [
                'messages' => [
                    ['sender' => 'self', 'message' => 'Just a message'],
                ],
            ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('threads', [
            'user_id' => $this->user->id,
            'name' => null,
            'recipient_name' => null,
            'recipient_location' => null,
            'status' => 'submitted',
        ]);
    }
}
