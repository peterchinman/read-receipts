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
        // ============================================
        // USERS
        // ============================================

        $admin = User::factory()->create([
            'name' => 'Admin',
            'display_name' => 'Admin',
            'email' => 'admin@example.com',
            'is_admin' => true,
        ]);

        $alice = User::factory()->create([
            'name' => 'Alice Chen',
            'display_name' => 'Alice Chen',
            'email' => 'alice@example.com',
        ]);

        $bob = User::factory()->create([
            'name' => 'Bob Rivera',
            'display_name' => 'Bob Rivera',
            'email' => 'bob@example.com',
        ]);

        $carol = User::factory()->create([
            'name' => 'Carol Park',
            'display_name' => 'Carol Park',
            'email' => 'carol@example.com',
        ]);

        $david = User::factory()->create([
            'name' => 'David Okafor',
            'display_name' => 'David Okafor',
            'email' => 'david@example.com',
        ]);

        // ============================================
        // SUBMITTED THREADS (pending review)
        // ============================================

        $this->createThread($alice, [
            'name' => 'The Grocery List',
            'recipient_name' => 'Mom',
            'recipient_location' => 'Portland, OR',
            'messages' => [
                ['other', 'Can you pick up milk on the way home'],
                ['self', 'Yeah sure'],
                ['self', 'Anything else?'],
                ['other', 'Hmm let me think'],
                ['other', 'Bread'],
                ['other', 'Oh and eggs'],
                ['other', 'Actually get two dozen'],
                ['self', 'Two dozen eggs??'],
                ['other', 'Your sister is coming this weekend'],
                ['self', 'Nobody told me that'],
                ['other', 'I\'m telling you now'],
                ['self', 'Ok'],
                ['other', 'Also butter'],
                ['self', 'This is a lot of stuff'],
                ['other', 'You asked!'],
            ],
            'status' => 'submitted',
            'submitted_at' => now()->subDays(2),
        ]);

        $this->createThread($bob, [
            'name' => 'Running Late',
            'recipient_name' => 'Jamie',
            'recipient_location' => 'Chicago, IL',
            'messages' => [
                ['self', 'Hey are you here yet'],
                ['other', 'Almost'],
                ['self', 'You said that 20 minutes ago'],
                ['other', 'I know I know'],
                ['other', 'The train was delayed'],
                ['self', 'Which train'],
                ['other', 'The red line'],
                ['self', 'The red line has been running fine today'],
                ['other', '...'],
                ['other', 'Ok I overslept'],
                ['self', 'Lol I knew it'],
                ['other', 'I\'m literally getting dressed right now'],
                ['self', 'Just get here'],
            ],
            'status' => 'submitted',
            'submitted_at' => now()->subDays(1),
        ]);

        $this->createThread($carol, [
            'name' => 'The Dream',
            'recipient_name' => 'Leah',
            'recipient_location' => 'Austin, TX',
            'messages' => [
                ['self', 'I had the weirdest dream last night'],
                ['other', 'Tell me'],
                ['self', 'Ok so I was in a grocery store'],
                ['self', 'But all the aisles were made of glass'],
                ['other', 'Like transparent?'],
                ['self', 'Yeah and you could see through to other aisles'],
                ['self', 'But nobody else seemed to notice'],
                ['other', 'That\'s creepy'],
                ['self', 'And then I realized I was shopping for something but I couldn\'t remember what'],
                ['other', 'Classic dream stuff'],
                ['self', 'And then you were there'],
                ['other', 'Me??'],
                ['self', 'Yeah you were working the checkout'],
                ['self', 'And you said "you forgot the most important thing"'],
                ['other', 'What was it'],
                ['self', 'I woke up before I found out'],
                ['other', 'Wow'],
                ['other', 'That\'s actually kind of beautiful'],
            ],
            'status' => 'submitted',
            'submitted_at' => now()->subHours(6),
        ]);

        // ============================================
        // SUBMITTED - RESUBMISSION (was changes_requested, resubmitted)
        // ============================================

        $resubmitted = $this->createThread($david, [
            'name' => 'The Voicemail',
            'recipient_name' => 'Dad',
            'recipient_location' => 'Detroit, MI',
            'messages' => [
                ['other', 'Did you get my voicemail'],
                ['self', 'No one listens to voicemails dad'],
                ['other', 'I left you a very important voicemail'],
                ['self', 'Just text me what it said'],
                ['other', 'That defeats the purpose'],
                ['self', 'What purpose'],
                ['other', 'I wanted you to hear my voice'],
                ['self', 'Oh'],
                ['self', 'I\'ll listen to it'],
                ['other', 'Thank you'],
                ['self', 'But also you can just call me'],
                ['other', 'You never pick up'],
                ['self', 'Fair point'],
            ],
            'status' => 'submitted',
            'submitted_at' => now()->subHours(2),
        ]);

        // Add the history: submitted -> changes_requested -> resubmitted
        // The snapshot captures what the thread looked like before the resubmission
        $originalSubmitTime = now()->subDays(5);
        $originalBaseTime = $originalSubmitTime->copy()->subHours(rand(1, 24));
        $originalMessages = collect([
            ['other', 'Did you get my voicemail'],
            ['self', 'No one listens to voicemails dad'],
            ['other', 'I left you a very important voicemail'],
            ['self', 'Just text me what it said'],
            ['other', 'That defeats the purpose'],
            ['self', 'What purpose'],
            ['other', 'I wanted you to hear my voice'],
            ['self', 'Oh'],
        ])->map(function ($msg, $i) use ($originalBaseTime) {
            return [
                'sender' => $msg[0],
                'message' => $msg[1],
                'timestamp' => $originalBaseTime->copy()->addMinutes($i * rand(1, 5))->toISOString(),
                'position' => $i,
            ];
        })->all();

        // Attach snapshot to the original submitted event
        $resubmitted->submissionEvents()
            ->where('event_type', 'submitted')
            ->first()
            ->update([
                'snapshot' => [
                    'messages' => $originalMessages,
                    'name' => 'The Voicemail',
                    'recipient_name' => 'Dad',
                    'recipient_location' => 'Detroit, MI',
                ],
            ]);

        $resubmitted->submissionEvents()->create([
            'event_type' => 'changes_requested',
            'admin_id' => $admin->id,
            'notes' => 'Love the premise! Could you add a few more messages at the end to give it a stronger closing?',
            'created_at' => now()->subDays(3),
        ]);
        $resubmitted->submissionEvents()->create([
            'event_type' => 'resubmitted',
            'created_at' => now()->subHours(2),
        ]);

        // ============================================
        // SUBMITTED - RESUBMISSION (multiple rounds of edits)
        // ============================================

        // V3 (current) — the final version on the thread
        $multiEdit = $this->createThread($alice, [
            'name' => 'The Airport',
            'recipient_name' => 'Ryn',
            'recipient_location' => 'Denver, CO',
            'messages' => [
                ['self', 'When does your flight leave'],
                ['other', 'Two hours'],
                ['self', 'That\'s soon'],
                ['other', 'Yeah'],
                ['self', 'I don\'t know what to say'],
                ['other', 'You don\'t have to say anything'],
                ['self', 'I feel like I should'],
                ['other', 'Why'],
                ['self', 'Because what if this is it'],
                ['other', 'It\'s not it'],
                ['self', 'How do you know'],
                ['other', 'Because you\'re here'],
                ['other', 'People don\'t show up at airports for people they\'re ready to let go of'],
                ['self', 'I\'m not ready'],
                ['other', 'I know'],
                ['other', 'That\'s why I haven\'t gone through security yet'],
                ['self', 'Your flight'],
                ['other', 'There will be other flights'],
            ],
            'status' => 'submitted',
            'submitted_at' => now()->subHours(3),
        ]);

        // V1 snapshot — the original rough draft
        $v1Time = now()->subDays(10)->subHours(rand(1, 24));
        $v1Messages = collect([
            ['self', 'When does your flight leave'],
            ['other', 'Two hours'],
            ['self', 'That\'s soon'],
            ['other', 'Yeah'],
            ['self', 'Ok'],
            ['other', 'Ok'],
        ])->map(fn($msg, $i) => [
            'sender' => $msg[0],
            'message' => $msg[1],
            'timestamp' => $v1Time->copy()->addMinutes($i * rand(1, 5))->toISOString(),
            'position' => $i,
        ])->all();

        // V2 snapshot — improved but still needed work
        $v2Time = now()->subDays(7)->subHours(rand(1, 24));
        $v2Messages = collect([
            ['self', 'When does your flight leave'],
            ['other', 'Two hours'],
            ['self', 'That\'s soon'],
            ['other', 'Yeah'],
            ['self', 'I don\'t know what to say'],
            ['other', 'You don\'t have to say anything'],
            ['self', 'I feel like I should'],
            ['other', 'Just being here is enough'],
            ['self', 'Is it though'],
            ['other', 'Yeah'],
            ['self', 'Ok'],
            ['other', 'Ok'],
        ])->map(fn($msg, $i) => [
            'sender' => $msg[0],
            'message' => $msg[1],
            'timestamp' => $v2Time->copy()->addMinutes($i * rand(1, 5))->toISOString(),
            'position' => $i,
        ])->all();

        // Attach v1 snapshot to the original submitted event
        $multiEdit->submissionEvents()
            ->where('event_type', 'submitted')
            ->first()
            ->update([
                'snapshot' => [
                    'messages' => $v1Messages,
                    'name' => 'The Airport',
                    'recipient_name' => 'Ryn',
                    'recipient_location' => 'Denver, CO',
                ],
                'created_at' => now()->subDays(10),
            ]);

        // Round 1: changes requested
        $multiEdit->submissionEvents()->create([
            'event_type' => 'changes_requested',
            'admin_id' => $admin->id,
            'notes' => 'This has a really strong premise — two people at an airport, the weight of a departure hanging over them. But right now the conversation ends too quickly and doesn\'t earn its emotional moment. The back-and-forth "Ok" / "Ok" feels like a placeholder. What are they actually feeling? What\'s unsaid? Try to let the tension build — let them talk around the thing they\'re afraid to say before one of them finally says it. The piece should feel like it\'s holding its breath.',
            'created_at' => now()->subDays(9),
        ]);

        // Round 1: resubmitted (v2) — attach v2 snapshot here since this event introduced v2
        $multiEdit->submissionEvents()->create([
            'event_type' => 'resubmitted',
            'snapshot' => [
                'messages' => $v2Messages,
                'name' => 'The Airport',
                'recipient_name' => 'Ryn',
                'recipient_location' => 'Denver, CO',
            ],
            'created_at' => now()->subDays(7),
        ]);

        // Round 2: changes requested
        $multiEdit->submissionEvents()->create([
            'event_type' => 'changes_requested',
            'admin_id' => $admin->id,
            'notes' => 'Much better — the "I don\'t know what to say" / "You don\'t have to say anything" exchange is doing a lot of work and I love it. But the ending still deflates. "Just being here is enough" tells us the emotion instead of showing it. And then we\'re back to "Ok" / "Ok" which undoes the progress. What if instead of reassurance, the other person says something that reveals they\'re just as scared? Think about what would make someone miss their flight. That\'s the version of this piece I want to read.',
            'created_at' => now()->subDays(6),
        ]);

        // Round 2: resubmitted (v3, current) — no snapshot, this is the latest version
        $multiEdit->submissionEvents()->create([
            'event_type' => 'resubmitted',
            'created_at' => now()->subHours(3),
        ]);

        // ============================================
        // ACCEPTED THREADS (pending publication)
        // ============================================

        $accepted1 = $this->createThread($alice, [
            'name' => 'Three Dots',
            'recipient_name' => 'Sam',
            'recipient_location' => 'Brooklyn, NY',
            'messages' => [
                ['self', 'I need to tell you something'],
                ['other', 'Ok'],
                ['self', 'Actually never mind'],
                ['other', 'You can\'t do that'],
                ['self', 'Do what'],
                ['other', 'Say you need to tell me something and then say never mind'],
                ['self', 'I just did'],
                ['other', 'Tell me'],
                ['self', 'It\'s not a big deal'],
                ['other', 'Then just say it'],
                ['self', 'I miss you'],
                ['other', 'That\'s what you were afraid to say?'],
                ['self', 'Yeah'],
                ['other', 'I miss you too'],
                ['other', 'That wasn\'t so hard was it'],
            ],
            'status' => 'accepted',
            'submitted_at' => now()->subDays(5),
        ]);
        $accepted1->submissionEvents()->create([
            'event_type' => 'accepted',
            'admin_id' => $admin->id,
            'notes' => 'Beautiful piece. Ready to publish.',
            'created_at' => now()->subDays(1),
        ]);

        $accepted2 = $this->createThread($bob, [
            'name' => 'The Restaurant',
            'recipient_name' => 'Maya',
            'recipient_location' => 'San Francisco, CA',
            'messages' => [
                ['other', 'Where should we eat tonight'],
                ['self', 'I don\'t care you pick'],
                ['other', 'Thai?'],
                ['self', 'Hmm not feeling it'],
                ['other', 'Italian?'],
                ['self', 'We just had Italian'],
                ['other', 'You said you don\'t care'],
                ['self', 'I don\'t'],
                ['other', 'Then why are you vetoing everything'],
                ['self', 'I\'m not vetoing I\'m just providing feedback'],
                ['other', 'Ok what do YOU want'],
                ['self', 'I told you I don\'t care'],
                ['other', 'I\'m ordering pizza'],
                ['self', 'Perfect I love pizza'],
                ['other', 'I know'],
            ],
            'status' => 'accepted',
            'submitted_at' => now()->subDays(4),
        ]);
        $accepted2->submissionEvents()->create([
            'event_type' => 'accepted',
            'admin_id' => $admin->id,
            'created_at' => now()->subDays(1),
        ]);

        // ============================================
        // CHANGES REQUESTED THREADS
        // ============================================

        $changesThread = $this->createThread($carol, [
            'name' => 'Moving Day',
            'recipient_name' => 'Roommate',
            'recipient_location' => 'Philadelphia, PA',
            'messages' => [
                ['self', 'Did you take the couch'],
                ['other', 'Which couch'],
                ['self', 'THE couch'],
                ['self', 'The only couch we had'],
                ['other', 'Oh that couch'],
                ['other', 'Yeah'],
                ['self', 'That was my couch'],
                ['other', 'Was it though'],
                ['self', 'I bought it'],
                ['other', 'With our shared furniture fund'],
                ['self', 'There was no shared furniture fund'],
                ['other', 'Ok agree to disagree'],
            ],
            'status' => 'changes_requested',
            'submitted_at' => now()->subDays(3),
        ]);
        $changesThread->submissionEvents()->create([
            'event_type' => 'changes_requested',
            'admin_id' => $admin->id,
            'notes' => 'Great concept but the ending feels abrupt. Could you add a few more exchanges to build the tension?',
            'created_at' => now()->subDays(1),
        ]);

        // ============================================
        // REJECTED THREADS
        // ============================================

        $this->createThreadWithStatus($david, [
            'name' => 'Test Message',
            'recipient_name' => 'Nobody',
            'recipient_location' => 'Nowhere',
            'messages' => [
                ['self', 'Testing'],
                ['other', 'Testing what'],
                ['self', 'Just testing'],
            ],
            'status' => 'rejected',
            'submitted_at' => now()->subDays(7),
        ], $admin, 'rejected', 'This feels more like a test than a piece. We\'d love to see a more developed submission from you!');

        // ============================================
        // PUBLISHED THREADS
        // ============================================

        $this->createPublished($alice, $admin, [
            'name' => 'The Key',
            'recipient_name' => 'Alex',
            'recipient_location' => 'New York, NY',
            'messages' => [
                ['self', 'I still have your key'],
                ['other', 'I know'],
                ['self', 'Do you want it back'],
                ['other', 'Do you want to give it back'],
                ['self', 'Not really'],
                ['other', 'Then keep it'],
                ['self', 'It doesn\'t unlock anything anymore'],
                ['other', 'It unlocks a door'],
                ['self', 'You changed the locks'],
                ['other', 'I changed the locks'],
                ['self', 'So why should I keep it'],
                ['other', 'Because you\'re not ready to give it back'],
                ['self', 'How do you know that'],
                ['other', 'Because you still have it'],
            ],
        ], now()->subWeeks(4), now()->subWeeks(3));

        $this->createPublished($bob, $admin, [
            'name' => 'Read Receipts',
            'recipient_name' => 'Em',
            'recipient_location' => 'Los Angeles, CA',
            'messages' => [
                ['self', 'Why do you have read receipts on'],
                ['other', 'Why not'],
                ['self', 'Because now I know you read my message and didn\'t respond'],
                ['other', 'Maybe I was busy'],
                ['self', 'For three hours?'],
                ['other', 'Yes for three hours'],
                ['other', 'I have a life outside of this phone'],
                ['self', 'I know that'],
                ['other', 'Do you'],
                ['self', 'I just think if you read something you should respond'],
                ['other', 'That\'s not how it works'],
                ['self', 'Then how does it work'],
                ['other', 'Sometimes I read something and I need to think about what to say'],
                ['self', 'For three hours?'],
                ['other', 'Yes'],
                ['other', 'Some things are worth thinking about'],
            ],
        ], now()->subWeeks(3), now()->subWeeks(2));

        $this->createPublished($carol, $admin, [
            'name' => 'The Photo',
            'recipient_name' => 'Grandma',
            'recipient_location' => 'Miami, FL',
            'messages' => [
                ['other', 'How do I send a photo'],
                ['self', 'Click the camera icon'],
                ['other', 'Which one'],
                ['self', 'The one that looks like a camera'],
                ['other', 'There are two'],
                ['self', 'The one on the left'],
                ['other', 'Ok I pressed it'],
                ['other', 'Now what'],
                ['self', 'Take the photo'],
                ['other', 'I already took it. It\'s on the phone'],
                ['self', 'Then go to your photos and select it'],
                ['other', 'How'],
                ['self', 'I\'ll just come over'],
                ['other', 'That would be nice'],
                ['other', 'I made cookies'],
                ['self', 'I\'ll be there in 20'],
            ],
        ], now()->subWeeks(2), now()->subWeeks(1));

        $this->createPublished($david, $admin, [
            'name' => 'Parallel Lines',
            'recipient_name' => 'Jordan',
            'recipient_location' => 'Seattle, WA',
            'messages' => [
                ['self', 'Do you ever think about how we almost didn\'t meet'],
                ['other', 'What do you mean'],
                ['self', 'Like if I had taken the earlier train that day'],
                ['other', 'You would have gotten to the party before me'],
                ['self', 'And probably left before you arrived'],
                ['other', 'But you didn\'t take the earlier train'],
                ['self', 'Because I couldn\'t find my keys'],
                ['other', 'The keys you always lose'],
                ['self', 'Yeah those ones'],
                ['other', 'So you\'re saying we exist because you\'re disorganized'],
                ['self', 'Basically yes'],
                ['other', 'I can live with that'],
            ],
        ], now()->subWeeks(1), now()->subDays(3));

        $this->createPublished($alice, $admin, [
            'name' => 'The Playlist',
            'recipient_name' => 'Noor',
            'recipient_location' => 'Nashville, TN',
            'messages' => [
                ['other', 'I made you a playlist'],
                ['self', 'You did?'],
                ['other', 'Yeah it\'s 47 songs'],
                ['self', 'That\'s a lot of songs'],
                ['other', 'Every one reminded me of you'],
                ['self', 'Even the sad ones?'],
                ['other', 'Especially the sad ones'],
                ['self', 'Why'],
                ['other', 'Because you make me feel everything at once'],
                ['self', 'I don\'t know what to say'],
                ['other', 'You don\'t have to say anything'],
                ['other', 'Just listen'],
            ],
        ], now()->subDays(5), now()->subDays(2));
    }

    /**
     * Create a thread with messages and a submitted event.
     */
    private function createThread(User $user, array $data): Thread
    {
        $baseTime = ($data['submitted_at'] ?? now())->copy()->subHours(rand(1, 48));

        $messages = collect($data['messages'])->map(function ($msg, $i) use ($baseTime) {
            return [
                'sender' => $msg[0],
                'message' => $msg[1],
                'timestamp' => $baseTime->copy()->addMinutes($i * rand(1, 5))->toISOString(),
                'position' => $i,
            ];
        })->all();

        $thread = Thread::create([
            'user_id' => $user->id,
            'name' => $data['name'],
            'recipient_name' => $data['recipient_name'],
            'recipient_location' => $data['recipient_location'],
            'messages' => $messages,
            'status' => $data['status'],
            'submitted_at' => $data['submitted_at'] ?? now(),
        ]);

        $thread->submissionEvents()->create([
            'event_type' => 'submitted',
            'created_at' => $data['submitted_at'] ?? now(),
        ]);

        return $thread;
    }

    /**
     * Create a thread with a final status event (rejected, etc).
     */
    private function createThreadWithStatus(User $user, array $data, User $admin, string $eventType, ?string $notes = null): Thread
    {
        $thread = $this->createThread($user, $data);

        $thread->submissionEvents()->create([
            'event_type' => $eventType,
            'admin_id' => $admin->id,
            'notes' => $notes,
            'created_at' => ($data['submitted_at'] ?? now())->copy()->addDays(1),
        ]);

        return $thread;
    }

    /**
     * Create a published thread with full event history.
     */
    private function createPublished(User $user, User $admin, array $data, $submittedAt, $publishedAt): Thread
    {
        $baseTime = $submittedAt->copy()->subHours(rand(1, 48));

        $messages = collect($data['messages'])->map(function ($msg, $i) use ($baseTime) {
            return [
                'sender' => $msg[0],
                'message' => $msg[1],
                'timestamp' => $baseTime->copy()->addMinutes($i * rand(1, 5))->toISOString(),
                'position' => $i,
            ];
        })->all();

        $thread = Thread::create([
            'user_id' => $user->id,
            'name' => $data['name'],
            'recipient_name' => $data['recipient_name'],
            'recipient_location' => $data['recipient_location'],
            'messages' => $messages,
            'status' => 'published',
            'submitted_at' => $submittedAt,
            'published_at' => $publishedAt,
        ]);

        $thread->submissionEvents()->create([
            'event_type' => 'submitted',
            'created_at' => $submittedAt,
        ]);
        $thread->submissionEvents()->create([
            'event_type' => 'accepted',
            'admin_id' => $admin->id,
            'created_at' => $submittedAt->copy()->addDays(2),
        ]);
        $thread->submissionEvents()->create([
            'event_type' => 'published',
            'admin_id' => $admin->id,
            'created_at' => $publishedAt,
        ]);

        return $thread;
    }
}
