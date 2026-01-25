<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'thread_id',
        'sender',
        'message',
        'timestamp',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
            'position' => 'integer',
        ];
    }

    public function thread()
    {
        return $this->belongsTo(Thread::class);
    }

    public function images()
    {
        return $this->hasMany(Image::class)->orderBy('position');
    }
}
