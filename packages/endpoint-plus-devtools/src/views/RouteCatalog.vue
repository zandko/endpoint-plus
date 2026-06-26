<script setup lang="ts">
import { computed } from 'vue';
import { AlertTriangleIcon, ExternalLinkIcon, FileCode2Icon } from '@lucide/vue';
import { Badge, ScrollArea } from '@/components/ui';
import type { DevtoolsRouteRecord } from '../types';
import { locationLabel, methodClass } from '../utils/route';

const props = defineProps<{
  routes: readonly DevtoolsRouteRecord[];
}>();

const emit = defineEmits<{
  openFile: [file: string, line?: number, column?: number];
}>();

interface RouteGroup {
  key: string;
  routes: DevtoolsRouteRecord[];
  isDuplicate: boolean;
}

const groupedRoutes = computed<RouteGroup[]>(() => {
  const map = new Map<string, DevtoolsRouteRecord[]>();
  for (const route of props.routes) {
    const key = `${route.method.toUpperCase()} ${route.template}`;
    const arr = map.get(key) ?? [];
    arr.push(route);
    map.set(key, arr);
  }
  return [...map.entries()].map(([key, routes]) => ({
    key,
    routes,
    isDuplicate: routes.length > 1,
  }));
});

const duplicateCount = computed(() => groupedRoutes.value.filter((g) => g.isDuplicate).length);
</script>

<template>
  <div
    class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border"
  >
    <!-- Sub-header -->
    <div class="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
      <span class="text-xs text-muted-foreground">
        {{ routes.length }} endpoint{{ routes.length !== 1 ? 's' : '' }} ·
        {{ groupedRoutes.length }} unique routes
      </span>
      <Badge v-if="duplicateCount > 0" variant="destructive" class="gap-1 text-[0.6rem]">
        <AlertTriangleIcon :size="10" />
        {{ duplicateCount }} duplicate{{ duplicateCount > 1 ? 's' : '' }}
      </Badge>
    </div>

    <!-- Route list -->
    <template v-if="routes.length">
      <!-- Column headings -->
      <div
        class="grid shrink-0 grid-cols-[2rem_1fr_1fr_minmax(0,1fr)] gap-x-3 border-b border-border bg-card/95 px-4 py-1.5 backdrop-blur-sm"
      >
        <div />
        <span class="col-label">Endpoint</span>
        <span class="col-label">Type name</span>
        <span class="col-label">Source file</span>
      </div>

      <ScrollArea class="min-h-0 flex-1">
        <template v-for="group in groupedRoutes" :key="group.key">
          <!-- Duplicate warning banner -->
          <div
            v-if="group.isDuplicate"
            class="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5"
          >
            <AlertTriangleIcon :size="11" class="shrink-0 text-amber-500" />
            <span class="text-[0.65rem] font-medium text-amber-700">
              {{ group.routes.length }} definitions of
              <code class="font-mono">{{ group.key }}</code>
            </span>
          </div>

          <!-- Route rows -->
          <div
            v-for="route in group.routes"
            :key="route.id"
            class="group grid grid-cols-[2rem_1fr_1fr_minmax(0,1fr)] items-center gap-x-3 border-b border-border/50 px-4 py-2.5 transition-colors hover:bg-muted/50"
            :class="group.isDuplicate && 'bg-amber-50/30 hover:bg-amber-50/70'"
          >
            <!-- Dot indicator -->
            <span class="mx-auto block size-1.5 rounded-full bg-emerald-400" />

            <div class="flex min-w-0 items-center gap-2">
              <span
                class="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase leading-none"
                :class="methodClass(route.method)"
              >
                {{ route.method }}
              </span>
              <span class="truncate font-mono text-xs text-foreground" :title="route.template">
                {{ route.template }}
              </span>
            </div>

            <span
              class="truncate font-mono text-[0.7rem] text-muted-foreground"
              :title="route.responseTypeName"
            >
              {{ route.responseTypeName }}
            </span>

            <button
              v-if="route.file"
              type="button"
              class="flex min-w-0 items-center gap-1 text-left text-[0.65rem] text-muted-foreground/70 transition-colors hover:text-primary"
              :title="route.file"
              @click="emit('openFile', route.file!, route.line, route.column)"
            >
              <span class="truncate">{{ locationLabel(route) }}</span>
              <ExternalLinkIcon
                :size="10"
                class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>
            <span v-else class="text-[0.65rem] text-muted-foreground/30">—</span>
          </div>
        </template>
      </ScrollArea>
    </template>

    <!-- Empty state -->
    <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div class="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
        <FileCode2Icon :size="18" />
      </div>
      <p class="text-xs text-muted-foreground">
        No route candidates yet.<br />
        <span class="text-[0.68rem]">Add endpoint calls under src to get started.</span>
      </p>
    </div>
  </div>
</template>
