<?php

namespace Database\Seeders;

use App\Models\Thread;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create test user
        $testUser = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // Create admin user
        $adminUser = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'is_admin' => true,
        ]);

        // Create another regular user
        $otherUser = User::factory()->create([
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
        ]);

        // ============================================
        // SUBMITTED THREADS (pending review)
        // ============================================

        $submittedThread1 = Thread::create([
            'user_id' => $testUser->id,
            'name' => 'Test Submitted 1',
            'recipient_name' => 'Person B',
            'recipient_location' => 'Place B',
            'messages' => [
                ['sender' => 'self', 'message' => 'Aaa bbb ccc', 'timestamp' => now()->subWeeks(1)->setHour(10)->setMinute(0)->toISOString(), 'position' => 0],
                ['sender' => 'other', 'message' => 'Ddd eee fff', 'timestamp' => now()->subWeeks(1)->setHour(10)->setMinute(1)->toISOString(), 'position' => 1],
                ['sender' => 'self', 'message' => 'Ggg hhh iii', 'timestamp' => now()->subWeeks(1)->setHour(10)->setMinute(3)->toISOString(), 'position' => 2],
                ['sender' => 'other', 'message' => 'Jjj kkk lll', 'timestamp' => now()->subWeeks(1)->setHour(10)->setMinute(5)->toISOString(), 'position' => 3],
            ],
            'status' => 'submitted',
            'submitted_at' => now()->subDays(1),
        ]);

        $submittedThread1->submissionEvents()->create([
            'event_type' => 'submitted',
        ]);

        // Another submitted thread from different user
        $submittedThread2 = Thread::create([
            'user_id' => $otherUser->id,
            'name' => 'Test Submitted 2',
            'recipient_name' => 'Person C',
            'recipient_location' => 'Place C',
            'messages' => [
                ['sender' => 'self', 'message' => 'Foo bar baz', 'timestamp' => now()->subMonths(2)->setHour(10)->setMinute(0)->toISOString(), 'position' => 0],
                ['sender' => 'other', 'message' => 'Qux quux corge', 'timestamp' => now()->subMonths(2)->setHour(10)->setMinute(1)->toISOString(), 'position' => 1],
                ['sender' => 'self', 'message' => 'Grault garply waldo', 'timestamp' => now()->subMonths(2)->setHour(10)->setMinute(2)->toISOString(), 'position' => 2],
            ],
            'status' => 'submitted',
            'submitted_at' => now()->subHours(6),
        ]);

        $submittedThread2->submissionEvents()->create([
            'event_type' => 'submitted',
        ]);

        // ============================================
        // PUBLISHED THREADS
        // ============================================

        $publishedRecipients = [
            ['name' => 'Person D', 'location' => 'Place D'],
            ['name' => 'Person E', 'location' => 'Place E'],
            ['name' => 'Person G', 'location' => 'Place G'],
            ['name' => 'Person H', 'location' => 'Place H'],
            ['name' => 'Person I', 'location' => 'Place I'],
        ];

        $publishedMessageSeeds = [
            ['self', 'Alpha beta gamma'],
            ['other', 'Delta epsilon zeta'],
            ['self', 'Eta theta iota'],
            ['other', 'Kappa lambda mu'],
            ['self', 'Nu xi omicron'],
        ];

        for ($i = 1; $i <= 20; $i++) {
            $recipient = $publishedRecipients[($i - 1) % count($publishedRecipients)];
            $author = $i % 2 === 0 ? $otherUser : $testUser;
            $submittedAt = now()->subWeeks(6)->addDays($i);
            $publishedAt = $submittedAt->copy()->addDays(7);
            $messageBaseTime = now()->subMonths(6)->addDays($i)->setHour(16)->setMinute(0);

            $messages = [];
            $position = 0;
            for ($repeat = 0; $repeat < 5; $repeat++) {
                foreach ($publishedMessageSeeds as $seed) {
                    $messages[] = [
                        'sender' => $seed[0],
                        'message' => $seed[1],
                        'timestamp' => $messageBaseTime->copy()->addMinutes($position)->toISOString(),
                        'position' => $position,
                    ];
                    $position++;
                }
            }

            $publishedThread = Thread::create([
                'user_id' => $author->id,
                'name' => "Test Published {$i}",
                'recipient_name' => $recipient['name'],
                'recipient_location' => $recipient['location'],
                'messages' => $messages,
                'status' => 'published',
                'submitted_at' => $submittedAt,
                'published_at' => $publishedAt,
            ]);

            $publishedThread->submissionEvents()->create([
                'event_type' => 'submitted',
                'created_at' => $submittedAt,
            ]);
            $publishedThread->submissionEvents()->create([
                'event_type' => 'published',
                'admin_id' => $adminUser->id,
                'created_at' => $publishedAt,
            ]);
        }

        // ============================================
        // REJECTED THREAD
        // ============================================

        $rejectedThread = Thread::create([
            'user_id' => $testUser->id,
            'name' => 'Test Rejected',
            'recipient_name' => 'Person F',
            'recipient_location' => 'Place F',
            'messages' => [
                ['sender' => 'self', 'message' => 'Xyz', 'timestamp' => now()->subDays(10)->setHour(12)->setMinute(0)->toISOString(), 'position' => 0],
                ['sender' => 'other', 'message' => 'Abc', 'timestamp' => now()->subDays(10)->setHour(12)->setMinute(1)->toISOString(), 'position' => 1],
            ],
            'status' => 'rejected',
            'submitted_at' => now()->subDays(5),
        ]);

        $rejectedThread->submissionEvents()->create([
            'event_type' => 'submitted',
            'created_at' => now()->subDays(5),
        ]);
        $rejectedThread->submissionEvents()->create([
            'event_type' => 'rejected',
            'admin_id' => $adminUser->id,
            'notes' => 'Test rejection notes.',
            'created_at' => now()->subDays(4),
        ]);
    }
}
