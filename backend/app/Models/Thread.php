<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $user_id
 * @property string|null $name
 * @property string|null $recipient_name
 * @property string|null $recipient_location
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
        'recipient_name',
        'recipient_location',
        'messages',
        'status',
        'submitted_at',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'messages' => 'array',
            'submitted_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function submissionEvents()
    {
        return $this->hasMany(SubmissionEvent::class)->orderBy('created_at', 'desc');
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
        $this->update(['status' => 'accepted']);

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
        ]);

        $this->submissionEvents()->create([
            'event_type' => 'published',
            'admin_id' => $admin->id,
        ]);
    }
}
