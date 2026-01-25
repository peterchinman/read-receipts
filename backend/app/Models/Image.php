<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Image extends Model
{
    protected $fillable = [
        'message_id',
        'filename',
        'alt_text',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
        ];
    }

    public function message()
    {
        return $this->belongsTo(Message::class);
    }
}
