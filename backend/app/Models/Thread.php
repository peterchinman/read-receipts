<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Thread extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'recipient_name',
        'recipient_location',
        'status',
        'submitted_at',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function messages()
    {
        return $this->hasMany(Message::class)->orderBy('position');
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

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function submit(): void
    {
        $this->update([
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $this->submissionEvents()->create([
            'event_type' => 'submitted',
        ]);
    }

    public function accept(User $admin, ?string $notes = null): void
    {
        $this->update(['status' => 'published']);

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
