<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('threads', function (Blueprint $table) {
            $table->string('edit_token', 64)->nullable()->after('status')->index();
            $table->string('author_info_token', 64)->nullable()->after('edit_token')->index();
        });

        Schema::create('author_infos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('thread_id')->constrained()->cascadeOnDelete();
            $table->string('payment_platform');
            $table->string('payment_username');
            $table->string('name')->nullable();
            $table->string('link')->nullable();
            $table->text('bio')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('author_infos');

        Schema::table('threads', function (Blueprint $table) {
            $table->dropColumn('author_info_token');
            $table->dropColumn('edit_token');
        });
    }
};
