<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $thread_id
 * @property string $event_type
 * @property int|null $admin_id
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $admin
 * @property-read \App\Models\Thread $thread
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubmissionEvent newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubmissionEvent newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubmissionEvent query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubmissionEvent whereAdminId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubmissionEvent whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubmissionEvent whereEventType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubmissionEvent whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubmissionEvent whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubmissionEvent whereThreadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubmissionEvent whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class SubmissionEvent extends Model
{
    protected $fillable = [
        'thread_id',
        'event_type',
        'admin_id',
        'notes',
    ];

    public function thread()
    {
        return $this->belongsTo(Thread::class);
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
