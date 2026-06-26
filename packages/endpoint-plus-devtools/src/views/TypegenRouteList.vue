<script setup lang="ts">
import { AlertCircleIcon, CheckCircle2Icon, ExternalLinkIcon, FileCode2Icon } from '@lucide/vue';
import {
  Badge,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';
import type { DevtoolsRouteRecord } from '../types';
import { locationLabel, methodClass } from '../utils/route';

defineProps<{
  routes: readonly DevtoolsRouteRecord[];
  selectedId?: string;
}>();

const emit = defineEmits<{
  select: [id: string];
  openFile: [file: string, line?: number, column?: number];
}>();
</script>

<template>
  <section
    class="flex min-h-0 flex-col overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border"
  >
    <!-- Header -->
    <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div>
        <p class="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Captured
        </p>
        <h2 class="text-xs font-semibold text-foreground">Routes with response data</h2>
      </div>
      <Badge variant="secondary" class="tabular-nums">{{ routes.length }}</Badge>
    </div>

    <template v-if="routes.length">
      <ScrollArea class="min-h-0 flex-1">
        <TooltipProvider :delay-duration="500">
          <div class="flex flex-col gap-0.5 p-1.5">
            <button
              v-for="route in routes"
              :key="route.id"
              type="button"
              class="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-150"
              :class="
                route.id === selectedId ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-muted'
              "
              @click="emit('select', route.id)"
            >
              <component
                :is="route.status === 'resolved' ? CheckCircle2Icon : AlertCircleIcon"
                :size="14"
                class="shrink-0"
                :class="route.status === 'resolved' ? 'text-emerald-500' : 'text-amber-500'"
              />

              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="flex min-w-0 items-center gap-1.5">
                  <span
                    class="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase leading-none"
                    :class="methodClass(route.method)"
                  >
                    {{ route.method }}
                  </span>
                  <span class="truncate text-xs text-foreground">{{ route.template }}</span>
                </span>
                <span class="flex items-center gap-1.5 pl-0.5">
                  <span class="truncate font-mono text-[0.65rem] text-muted-foreground">
                    {{ route.responseTypeName }}
                  </span>
                  <span
                    v-if="route.file"
                    class="truncate text-[0.55rem] text-muted-foreground/50"
                    :title="route.file"
                  >
                    · {{ locationLabel(route) }}
                  </span>
                </span>
              </span>

              <!-- Actions -->
              <div class="flex shrink-0 items-center gap-1">
                <Tooltip v-if="route.file">
                  <TooltipTrigger as-child>
                    <span
                      class="inline-flex size-5 items-center justify-center rounded opacity-0 transition-opacity hover:bg-muted-foreground/10 group-hover:opacity-100"
                      @click.stop="emit('openFile', route.file!, route.line, route.column)"
                    >
                      <ExternalLinkIcon :size="11" class="text-muted-foreground" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Open source file</TooltipContent>
                </Tooltip>
                <Badge
                  :variant="route.status === 'resolved' ? 'secondary' : 'outline'"
                  class="shrink-0 text-[0.6rem]"
                >
                  {{ route.status === 'resolved' ? 'source' : 'unresolved' }}
                </Badge>
              </div>
            </button>
          </div>
        </TooltipProvider>
      </ScrollArea>
    </template>

    <!-- Empty state -->
    <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div class="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
        <FileCode2Icon :size="18" />
      </div>
      <p class="text-xs text-muted-foreground">
        No captured routes yet.<br />
        <span class="text-[0.68rem]">Make requests in your app to capture response data.</span>
      </p>
    </div>
  </section>
</template>
