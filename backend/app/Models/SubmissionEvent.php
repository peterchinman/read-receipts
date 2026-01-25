<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
