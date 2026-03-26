<script lang="ts">
  export let startTimestamp: number;
  
  let elapsed = 0;
  let interval: ReturnType<typeof setInterval>;
  
  function updateTimer() {
    const now = Math.floor(Date.now() / 1000);
    elapsed = now - startTimestamp;
  }
  
  function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  onMount(() => {
    updateTimer();
    interval = setInterval(updateTimer, 1000);
  });
  
  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
  
  import { onMount, onDestroy } from 'svelte';
</script>

<div class="flex justify-center items-center gap-2 text-5xl font-mono font-bold text-orange-600 dark:text-orange-400 tabular-nums">
  <div class="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow-inner">
    {formatTime(elapsed).split(':')[0]}
  </div>
  <span class="text-4xl">:</span>
  <div class="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow-inner">
    {formatTime(elapsed).split(':')[1]}
  </div>
  <span class="text-4xl">:</span>
  <div class="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow-inner">
    {formatTime(elapsed).split(':')[2]}
  </div>
</div>