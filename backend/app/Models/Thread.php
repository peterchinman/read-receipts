<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $user_id
 * @property string|null $name
 * @property array|null $participants
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $submitted_at
 * @property \Illuminate\Support\Carbon|null $published_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property array $messages
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\SubmissionEvent> $submissionEvents
 * @property-read int|null $submission_events_count
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread published()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread submitted()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread wherePublishedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread whereRecipientLocation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread whereRecipientName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread whereSubmittedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread whereUserId($value)
 * @method static \Database\Factories\ThreadFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Thread whereMessages($value)
 * @mixin \Eloquent
 */
class Thread extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'participants',
        'messages',
        'status',
        'edit_token',
        'author_info_token',
        'submitted_at',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'participants' => 'array',
            'messages' => 'array',
            'submitted_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function displayName(): string
    {
        return $this->name
            ?: (($this->participants[0]['full_name'] ?? null) ?: 'Untitled');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function submissionEvents()
    {
        return $this->hasMany(SubmissionEvent::class)->orderBy('created_at', 'desc');
    }

    public function authorInfo()
    {
        return $this->hasOne(AuthorInfo::class);
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeSubmitted($query)
    {
        return $query->where('status', 'submitted');
    }

    public function accept(User $admin, ?string $notes = null): void
    {
        $this->update([
            'status' => 'accepted',
            'author_info_token' => Str::random(64),
        ]);

        $this->submissionEvents()->create([
            'event_type' => 'accepted',
            'admin_id' => $admin->id,
            'notes' => $notes,
        ]);
    }

    public function reject(User $admin, ?string $notes = null): void
    {
        $this->update(['status' => 'rejected']);

        $this->submissionEvents()->create([
            'event_type' => 'rejected',
            'admin_id' => $admin->id,
            'notes' => $notes,
        ]);
    }

    public function publish(User $admin): void
    {
        $this->update([
            'status' => 'published',
            'published_at' => now(),
            'author_info_token' => null,
        ]);

        $this->submissionEvents()->create([
            'event_type' => 'published',
            'admin_id' => $admin->id,
        ]);
    }

    public function requestChanges(User $admin, string $notes): void
    {
        $this->update([
            'status' => 'changes_requested',
            'edit_token' => Str::random(64),
        ]);

        $this->submissionEvents()->create([
            'event_type' => 'changes_requested',
            'admin_id' => $admin->id,
            'notes' => $notes,
        ]);
    }

    public function resubmit(array $data): void
    {
        $snapshot = [
            'messages' => $this->messages,
            'name' => $this->name,
            'participants' => $this->participants,
        ];

        // Attach snapshot to the event that introduced the version being replaced
        $introducingEvent = $this->submissionEvents()
            ->whereIn('event_type', ['submitted', 'resubmitted'])
            ->first();

        if ($introducingEvent) {
            $introducingEvent->update(['snapshot' => $snapshot]);
        }

        $this->update([
            'messages' => $data['messages'],
            'name' => $data['name'] ?? $this->name,
            'participants' => $data['participants'] ?? $this->participants,
            'status' => 'submitted',
            'submitted_at' => now(),
            'edit_token' => null,
        ]);

        $this->submissionEvents()->create([
            'event_type' => 'resubmitted',
        ]);
    }
}
