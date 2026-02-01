<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Thread>
 */
class ThreadFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => \App\Models\User::factory(),
            'name' => fake()->sentence(3),
            'recipient_name' => fake()->name(),
            'recipient_location' => fake()->city() . ', ' . fake()->stateAbbr(),
            'messages' => [
                [
                    'sender' => 'self',
                    'message' => fake()->paragraph(),
                    'timestamp' => now()->toISOString(),
                    'position' => 0,
                ],
            ],
            'status' => 'submitted',
            'submitted_at' => now(),
            'published_at' => null,
        ];
    }
}
