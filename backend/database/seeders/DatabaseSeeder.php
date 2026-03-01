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
            'name' => null,
            'participants' => [['id' => 'p1', 'full_name' => 'R', 'location' => 'Portland, OR', 'avatar_url' => null]],
            'messages' => [
                ['self', 'the milk is doing it again'],
                ['other', 'doing what'],
                ['self', 'you know'],
                ['other', 'I really don\'t'],
                ['self', 'standing up in the carton'],
                ['self', 'like it\'s waiting for something'],
                ['other', 'milk doesn\'t stand up'],
                ['self', 'this milk does'],
                ['self', 'I think it knows about the fridge'],
                ['other', 'what about the fridge'],
                ['self', 'I can\'t say it over text'],
                ['other', 'you can say anything over text'],
                ['self', 'not this'],
                ['other', 'are you ok'],
                ['self', 'the milk winked at me'],
                ['other', 'I\'m coming over'],
                ['self', 'bring something to drink'],
                ['self', 'not milk'],
            ],
            'status' => 'submitted',
            'submitted_at' => now()->subDays(2),
        ]);

        $this->createThread($bob, [
            'name' => 'The Navigator',
            'participants' => [['id' => 'p1', 'full_name' => 'Priya', 'location' => 'Chicago, IL', 'avatar_url' => null]],
            'messages' => [
                ['self', 'turn left here'],
                ['other', 'that\'s a wall'],
                ['self', 'the map says left'],
                ['other', 'the map is wrong'],
                ['self', 'the map is never wrong'],
                ['other', 'there is a physical wall'],
                ['self', 'maybe the wall is wrong'],
                ['other', 'walls aren\'t wrong'],
                ['self', 'in my experience walls are frequently wrong'],
                ['other', 'that is not a thing'],
                ['other', 'I\'m turning right'],
                ['self', 'noted under protest'],
                ['other', 'noted'],
                ['self', 'the wall was wrong'],
                ['other', 'we came out where we needed to be'],
                ['self', 'I\'m updating my map'],
            ],
            'status' => 'submitted',
            'submitted_at' => now()->subDays(1),
        ]);

        $this->createThread($carol, [
            'name' => null,
            'participants' => [['id' => 'p1', 'full_name' => 'Leah', 'location' => 'Austin, TX', 'avatar_url' => null]],
            'messages' => [
                ['self', 'I found a tooth in my coat pocket'],
                ['other', 'whose tooth'],
                ['self', 'I don\'t know'],
                ['self', 'it\'s not mine'],
                ['other', 'how do you know'],
                ['self', 'it has a different memory than me'],
                ['other', 'teeth don\'t have memories'],
                ['self', 'this one does'],
                ['self', 'it keeps showing me a kitchen I\'ve never been in'],
                ['other', 'that\'s not possible'],
                ['self', 'it smells like cinnamon and something burning'],
                ['other', 'are you holding it right now'],
                ['self', 'I can\'t put it down'],
                ['other', 'should I come over'],
                ['self', 'it wants you to'],
                ['other', 'the tooth wants me to come over'],
                ['self', 'yes'],
                ['other', 'ok'],
                ['other', 'I\'m coming'],
            ],
            'status' => 'submitted',
            'submitted_at' => now()->subHours(6),
        ]);

        // ============================================
        // SUBMITTED - RESUBMISSION (was changes_requested, resubmitted)
        // ============================================

        $resubmitted = $this->createThread($david, [
            'name' => null,
            'participants' => [['id' => 'p1', 'full_name' => 'Dad', 'location' => 'Detroit, MI', 'avatar_url' => null]],
            'messages' => [
                ['other', 'did you listen to the voicemail'],
                ['self', 'I did'],
                ['other', 'and'],
                ['self', 'I have questions'],
                ['other', 'what kind of questions'],
                ['self', 'like why was it in a different language'],
                ['other', 'what language'],
                ['self', 'I don\'t know. that\'s the question'],
                ['other', 'I left it in English'],
                ['self', 'it was not in English'],
                ['self', 'also the voice was different'],
                ['other', 'different how'],
                ['self', 'lower'],
                ['self', 'like it had been underwater for a long time'],
                ['other', 'that was my voice'],
                ['self', 'was it'],
                ['other', 'yes'],
                ['self', 'did you understand it'],
                ['other', 'somehow yes'],
                ['other', 'what did it say'],
                ['self', 'it said I love you'],
                ['other', 'that\'s right'],
                ['self', 'I love you too dad'],
            ],
            'status' => 'submitted',
            'submitted_at' => now()->subHours(2),
        ]);

        // Add the history: submitted -> changes_requested -> resubmitted
        $originalSubmitTime = now()->subDays(5);
        $originalBaseTime = $originalSubmitTime->copy()->subHours(rand(1, 24));
        $originalMessages = collect([
            ['other', 'did you listen to the voicemail'],
            ['self', 'I did'],
            ['other', 'and'],
            ['self', 'I have questions'],
            ['other', 'what kind of questions'],
            ['self', 'like why was it in a different language'],
            ['other', 'what language'],
            ['self', 'I don\'t know. that\'s the question'],
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
                    'name' => null,
                    'participants' => [['id' => 'p1', 'full_name' => 'Dad', 'location' => 'Detroit, MI', 'avatar_url' => null]],
                ],
            ]);

        $resubmitted->submissionEvents()->create([
            'event_type' => 'changes_requested',
            'admin_id' => $admin->id,
            'notes' => 'This is genuinely strange in the best way. The underwater voice is doing a lot of work. But it cuts off right when it gets interesting — we don\'t get to hear what the message actually said. The piece needs its ending. What did the voice say? That\'s the whole thing.',
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
            'name' => null,
            'participants' => [['id' => 'p1', 'full_name' => 'Ryn', 'location' => 'Denver, CO', 'avatar_url' => null]],
            'messages' => [
                ['self', 'are you at the airport'],
                ['other', 'I think so'],
                ['self', 'you think so'],
                ['other', 'it has the look of an airport'],
                ['other', 'the fluorescence'],
                ['self', 'which gate'],
                ['other', 'the gate keeps changing'],
                ['self', 'gates don\'t change'],
                ['other', 'mine does'],
                ['self', 'what does it say now'],
                ['other', 'C7'],
                ['self', 'I\'m at C7'],
                ['other', 'I know'],
                ['other', 'I can see you'],
                ['self', 'where'],
                ['other', 'you\'re standing very still'],
                ['other', 'you look like you\'re trying not to disappear'],
                ['self', 'is it working'],
                ['other', 'mostly'],
            ],
            'status' => 'submitted',
            'submitted_at' => now()->subHours(3),
        ]);

        // V1 snapshot — the original rough draft
        $v1Time = now()->subDays(10)->subHours(rand(1, 24));
        $v1Messages = collect([
            ['self', 'are you at the airport'],
            ['other', 'yes'],
            ['self', 'which terminal'],
            ['other', 'C'],
            ['self', 'all the terminals here are C'],
            ['other', 'I know'],
            ['self', 'ok'],
            ['other', 'ok'],
        ])->map(fn($msg, $i) => [
            'sender' => $msg[0],
            'message' => $msg[1],
            'timestamp' => $v1Time->copy()->addMinutes($i * rand(1, 5))->toISOString(),
            'position' => $i,
        ])->all();

        // V2 snapshot — improved but still needed work
        $v2Time = now()->subDays(7)->subHours(rand(1, 24));
        $v2Messages = collect([
            ['self', 'are you at the airport'],
            ['other', 'yes'],
            ['self', 'which terminal'],
            ['other', 'the same one as last time'],
            ['self', 'that doesn\'t help'],
            ['other', 'it all looks the same'],
            ['self', 'there are numbers'],
            ['other', 'the numbers keep changing'],
            ['self', 'the numbers don\'t change'],
            ['other', 'mine do'],
            ['self', 'ok'],
            ['other', 'ok'],
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
                    'name' => null,
                    'participants' => [['id' => 'p1', 'full_name' => 'Ryn', 'location' => 'Denver, CO', 'avatar_url' => null]],
                ],
                'created_at' => now()->subDays(10),
            ]);

        // Round 1: changes requested
        $multiEdit->submissionEvents()->create([
            'event_type' => 'changes_requested',
            'admin_id' => $admin->id,
            'notes' => 'Something real is trying to happen here but "all the terminals here are C" reads like a setup without a punchline. The disorientation is interesting — lean into it. Why is the airport wrong? What is the airport standing in for? The piece needs to decide if it\'s funny or haunted. Right now it\'s neither. The final "ok / ok" is a placeholder, not an ending.',
            'created_at' => now()->subDays(9),
        ]);

        // Round 1: resubmitted (v2) — attach v2 snapshot here since this event introduced v2
        $multiEdit->submissionEvents()->create([
            'event_type' => 'resubmitted',
            'snapshot' => [
                'messages' => $v2Messages,
                'name' => null,
                'participants' => [['id' => 'p1', 'full_name' => 'Ryn', 'location' => 'Denver, CO', 'avatar_url' => null]],
            ],
            'created_at' => now()->subDays(7),
        ]);

        // Round 2: changes requested
        $multiEdit->submissionEvents()->create([
            'event_type' => 'changes_requested',
            'admin_id' => $admin->id,
            'notes' => 'Better — "the numbers keep changing" opens a door. But then you close it again with "ok / ok." I want to know what\'s on the other side of that door. Is this person actually at the airport? Are they somewhere else entirely, pretending? The fluorescence, the shifting gates — you\'re building something. Don\'t flinch at the end. Let the strangeness finish the sentence.',
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
            'name' => null,
            'participants' => [['id' => 'p1', 'full_name' => 'Sam', 'location' => 'Brooklyn, NY', 'avatar_url' => null]],
            'messages' => [
                ['self', 'I need to tell you something'],
                ['other', 'ok'],
                ['self', 'actually I can\'t'],
                ['other', 'why'],
                ['self', 'I\'m not sure it happened'],
                ['other', 'what do you mean'],
                ['self', 'like I might have invented it'],
                ['other', 'invented what'],
                ['self', 'the thing I was going to tell you'],
                ['other', 'how do you invent something that happened to you'],
                ['self', 'I\'m still working that out'],
                ['other', 'just tell me'],
                ['self', 'I think I\'ve been leaving things in other people\'s memories'],
                ['other', 'what kind of things'],
                ['self', 'small ones'],
                ['self', 'a chair. a color. the smell of something cooking'],
                ['other', 'that\'s not possible'],
                ['self', 'are you sure'],
                ['other', 'do you have any of my memories'],
                ['self', 'the one with the yellow bicycle'],
                ['other', 'I never told you about the yellow bicycle'],
                ['self', 'I know'],
            ],
            'status' => 'accepted',
            'submitted_at' => now()->subDays(5),
        ]);
        $accepted1->submissionEvents()->create([
            'event_type' => 'accepted',
            'admin_id' => $admin->id,
            'notes' => 'The yellow bicycle. That\'s the whole piece right there. Yes.',
            'created_at' => now()->subDays(1),
        ]);

        $accepted2 = $this->createThread($bob, [
            'name' => 'The Appointment',
            'participants' => [['id' => 'p1', 'full_name' => 'Maya', 'location' => 'San Francisco, CA', 'avatar_url' => null]],
            'messages' => [
                ['other', 'are you almost here'],
                ['self', 'I\'m here'],
                ['other', 'I don\'t see you'],
                ['self', 'I\'m by the door'],
                ['other', 'there\'s no one by the door'],
                ['self', 'the door on the left'],
                ['other', 'all the doors are on the left'],
                ['self', 'the one that\'s slightly open'],
                ['other', 'they\'re all slightly open'],
                ['self', 'the one that smells like rain'],
                ['other', 'ok I think I smell it'],
                ['other', 'are you wearing a coat'],
                ['self', 'I\'m not wearing anything I own'],
                ['other', 'what does that mean'],
                ['self', 'it means come toward the smell'],
                ['other', 'I see you now'],
                ['other', 'why are you wearing that'],
                ['self', 'I\'ll explain inside'],
            ],
            'status' => 'accepted',
            'submitted_at' => now()->subDays(4),
        ]);
        $accepted2->submissionEvents()->create([
            'event_type' => 'accepted',
            'admin_id' => $admin->id,
            'notes' => 'Wonderful. The smell of rain as a landmark. The coat that belongs to no one. Ready to publish.',
            'created_at' => now()->subDays(1),
        ]);

        // ============================================
        // CHANGES REQUESTED THREADS
        // ============================================

        $changesThread = $this->createThread($carol, [
            'name' => 'The Inventory',
            'participants' => [['id' => 'p1', 'full_name' => 'Roommate', 'location' => 'Philadelphia, PA', 'avatar_url' => null]],
            'messages' => [
                ['self', 'did you take the clock'],
                ['other', 'which clock'],
                ['self', 'the one that ran backwards'],
                ['other', 'all our clocks ran backwards'],
                ['self', 'not the bathroom one'],
                ['other', 'the bathroom one especially'],
                ['self', 'I thought I was imagining it'],
                ['other', 'we both were'],
                ['other', 'that\'s how we knew we were compatible'],
                ['self', 'I want it back'],
                ['other', 'you can\'t have it'],
                ['self', 'why'],
                ['other', 'it won\'t work without both of us in the apartment'],
                ['self', 'that\'s not how clocks work'],
                ['other', 'that\'s how this one worked'],
                ['other', 'believe me I checked'],
            ],
            'status' => 'changes_requested',
            'submitted_at' => now()->subDays(3),
        ]);
        $changesThread->submissionEvents()->create([
            'event_type' => 'changes_requested',
            'admin_id' => $admin->id,
            'notes' => 'The backwards clocks are genuinely good. "That\'s how we knew we were compatible" is a great line. But the piece ends on an explanation, and explanations kill the strangeness — we don\'t want to know how the clock worked, we want to feel the loss of it. Can you cut the last two lines and find a different ending? Something that doesn\'t resolve.',
            'created_at' => now()->subDays(1),
        ]);

        // ============================================
        // REJECTED THREADS
        // ============================================

        $this->createThreadWithStatus($david, [
            'name' => null,
            'participants' => [['id' => 'p1', 'full_name' => 'Unknown', 'location' => null, 'avatar_url' => null]],
            'messages' => [
                ['self', 'hello'],
                ['other', 'hello'],
                ['self', 'how are you'],
                ['other', 'fine thanks'],
                ['self', 'what\'s your name'],
                ['other', 'I don\'t remember'],
                ['self', 'me neither'],
                ['other', 'we should probably figure that out'],
                ['self', 'agreed'],
                ['other', 'ok'],
                ['self', 'ok'],
            ],
            'status' => 'rejected',
            'submitted_at' => now()->subDays(7),
        ], $admin, 'rejected', 'Something is happening here but I can\'t tell what. The amnesia feels underdeveloped — who are these people and why don\'t they know each other? The concept needs more grounding before it can float. We\'d love to see a revision with more at stake.');

        // ============================================
        // PUBLISHED THREADS
        // ============================================

        $this->createPublished($alice, $admin, [
            'name' => null,
            'participants' => [['id' => 'p1', 'full_name' => 'Alex', 'location' => 'New York, NY', 'avatar_url' => null]],
            'messages' => [
                ['self', 'it happened again'],
                ['other', 'which side this time'],
                ['self', 'the left'],
                ['other', 'that\'s new'],
                ['self', 'I know'],
                ['other', 'did you document it'],
                ['self', 'yes'],
                ['self', 'same color as before'],
                ['self', 'but the sound was different'],
                ['other', 'different how'],
                ['self', 'quieter'],
                ['self', 'like it was being polite'],
                ['other', 'that\'s a good sign'],
                ['self', 'it left something behind'],
                ['other', 'don\'t touch it'],
                ['self', 'I already did'],
                ['other', 'what does it feel like'],
                ['self', 'like being remembered by someone who doesn\'t know you'],
                ['other', 'ok'],
                ['other', 'I\'m coming over'],
            ],
        ], now()->subWeeks(4), now()->subWeeks(3));

        $this->createPublished($bob, $admin, [
            'name' => null,
            'participants' => [['id' => 'p1', 'full_name' => 'Em', 'location' => 'Los Angeles, CA', 'avatar_url' => null]],
            'messages' => [
                ['other', 'there\'s a new door in my apartment'],
                ['self', 'new how'],
                ['other', 'it wasn\'t there yesterday'],
                ['self', 'where does it go'],
                ['other', 'I haven\'t opened it'],
                ['self', 'why not'],
                ['other', 'it seems like that would be rude'],
                ['self', 'to whom'],
                ['other', 'I don\'t know'],
                ['other', 'whoever put it there'],
                ['self', 'call your landlord'],
                ['other', 'what would I say'],
                ['self', 'that there\'s a door'],
                ['other', 'he\'ll want to know where it leads'],
                ['self', 'open it'],
                ['other', 'ok'],
                ['other', '...'],
                ['self', 'well'],
                ['other', 'stairs'],
                ['other', 'going up'],
                ['self', 'how many'],
                ['other', 'I can\'t see the top'],
            ],
        ], now()->subWeeks(3), now()->subWeeks(2));

        $this->createPublished($carol, $admin, [
            'name' => null,
            'participants' => [['id' => 'p1', 'full_name' => 'Grandma', 'location' => 'Miami, FL', 'avatar_url' => null]],
            'messages' => [
                ['other', 'I need to tell you about the photograph'],
                ['self', 'which one'],
                ['other', 'the one of you as a baby'],
                ['self', 'ok'],
                ['other', 'there\'s someone in the background'],
                ['self', 'that\'s just Uncle Ferris'],
                ['other', 'Uncle Ferris died the year before you were born'],
                ['self', 'what'],
                ['other', 'I\'ve been looking at it for thirty years'],
                ['other', 'I thought maybe I was wrong about the dates'],
                ['self', 'and'],
                ['other', 'I wasn\'t wrong about the dates'],
                ['self', 'what is he doing in the photo'],
                ['other', 'he\'s waving'],
                ['other', 'like he knew someone would eventually notice'],
                ['self', 'grandma'],
                ['other', 'I thought you should know'],
                ['other', 'he looked happy'],
            ],
        ], now()->subWeeks(2), now()->subWeeks(1));

        $this->createPublished($david, $admin, [
            'name' => null,
            'participants' => [['id' => 'p1', 'full_name' => 'Unknown', 'location' => null, 'avatar_url' => null]],
            'messages' => [
                ['self', 'who is this'],
                ['other', 'you know who this is'],
                ['self', 'I don\'t have this number saved'],
                ['other', 'I know'],
                ['self', 'how do you have my number'],
                ['other', 'you gave it to me'],
                ['self', 'when'],
                ['other', 'not yet'],
                ['self', 'that doesn\'t make sense'],
                ['other', 'it will'],
                ['self', 'what do you want'],
                ['other', 'to warn you'],
                ['self', 'about what'],
                ['other', 'the coat'],
                ['self', 'what coat'],
                ['other', 'the one you\'re about to buy'],
                ['other', 'don\'t'],
                ['self', 'why'],
                ['other', 'trust me'],
                ['self', 'I don\'t even know you'],
                ['other', 'you will'],
            ],
        ], now()->subWeeks(1), now()->subDays(3));

        $this->createPublished($alice, $admin, [
            'name' => null,
            'participants' => [['id' => 'p1', 'full_name' => 'Noor', 'location' => 'Nashville, TN', 'avatar_url' => null]],
            'messages' => [
                ['other', 'I made something for you'],
                ['self', 'what is it'],
                ['other', 'I don\'t know what to call it'],
                ['self', 'is it music'],
                ['other', 'it has music in it'],
                ['self', 'what else does it have'],
                ['other', 'a recording of rain from a country I\'ve never been to'],
                ['other', 'the sound of someone turning a page'],
                ['other', 'eleven seconds of silence that I measured carefully'],
                ['self', 'why eleven'],
                ['other', 'it took me eleven seconds to stop thinking about something'],
                ['self', 'what were you thinking about'],
                ['other', 'you'],
                ['self', 'what happens after the eleven seconds'],
                ['other', 'a song'],
                ['self', 'which one'],
                ['other', 'one you already know'],
                ['other', 'you just haven\'t heard it yet'],
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
            'participants' => $data['participants'],
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
            'participants' => $data['participants'],
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
