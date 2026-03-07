<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuthorInfo extends Model
{
    protected $fillable = [
        'thread_id',
        'payment_platform',
        'payment_username',
        'name',
        'link',
        'bio',
    ];

    public function thread()
    {
        return $this->belongsTo(Thread::class);
    }
}
