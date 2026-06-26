<script setup lang="ts">
import { ActivityIcon, FileCode2Icon, ListIcon } from '@lucide/vue';
import { Badge } from '@/components/ui';
import RouteCatalog from './views/RouteCatalog.vue';
import TypeWorkspace from './views/TypeWorkspace.vue';
import TypegenRouteList from './views/TypegenRouteList.vue';
import { useStore } from './composables/useStore';
import { sendToHost } from './utils/host';
import { cn } from './utils';
import { DEVTOOLS_TYPEGEN_OPEN } from './constants';

const store = useStore();

const NAV_ITEMS = [
  { id: 'catalog', icon: ListIcon, label: 'Route Catalog' },
  { id: 'typegen', icon: FileCode2Icon, label: 'Type Generation' },
] as const;

function openRouteFile(file: string, line?: number, column?: number): void {
  const location = line ? `${file}:${line}${column ? `:${column}` : ''}` : file;
  sendToHost(DEVTOOLS_TYPEGEN_OPEN, location);
}
</script>

<template>
  <main class="flex h-screen overflow-hidden bg-background text-foreground">
    <!-- Left sidebar -->
    <aside
      class="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-card px-2 py-3 shadow-sm"
    >
      <!-- Logo -->
      <div
        class="mb-3 grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
      >
        <ActivityIcon :size="16" />
      </div>

      <!-- Nav -->
      <button
        v-for="item in NAV_ITEMS"
        :key="item.id"
        :id="`nav-${item.id}`"
        type="button"
        :title="item.label"
        :class="cn('nav-item', store.activeTab.value === item.id && 'nav-item--active')"
        @click="store.setActiveTab(item.id)"
      >
        <component :is="item.icon" :size="17" />
      </button>

      <!-- Stats -->
      <div class="mt-auto flex flex-col items-center gap-1.5 text-center">
        <div class="flex flex-col items-center gap-0.5">
          <span class="tabular-nums text-[0.65rem] font-semibold leading-none text-foreground">
            {{ store.stats.value.total }}
          </span>
          <span class="text-[0.5rem] leading-none text-muted-foreground">scanned</span>
        </div>
        <div class="h-px w-6 bg-border" />
        <div class="flex flex-col items-center gap-0.5">
          <span class="tabular-nums text-[0.65rem] font-semibold leading-none text-primary">
            {{ store.stats.value.captured }}
          </span>
          <span class="text-[0.5rem] leading-none text-muted-foreground">captured</span>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <Transition name="panel" mode="out-in">
        <!-- Route Catalog -->
        <div
          v-if="store.activeTab.value === 'catalog'"
          key="catalog"
          class="flex min-h-0 flex-1 flex-col overflow-hidden p-4"
        >
          <header class="mb-3 flex shrink-0 items-center justify-between">
            <div>
              <p class="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
                Route Catalog
              </p>
              <h1 class="text-sm font-semibold text-foreground">All scanned endpoints</h1>
            </div>
            <Badge variant="outline" class="tabular-nums"
              >{{ store.stats.value.total }} routes</Badge
            >
          </header>
          <RouteCatalog :routes="store.routes.value" @open-file="openRouteFile" />
        </div>

        <!-- Type Generation -->
        <div
          v-else-if="store.activeTab.value === 'typegen'"
          key="typegen"
          class="flex min-h-0 flex-1 flex-col overflow-hidden p-4"
        >
          <header class="mb-3 flex shrink-0 items-center justify-between">
            <div>
              <p class="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
                Type Generation
              </p>
              <h1 class="text-sm font-semibold text-foreground">Response type preview & export</h1>
            </div>
            <Badge variant="secondary" class="tabular-nums"
              >{{ store.stats.value.captured }} captured</Badge
            >
          </header>

          <div
            v-if="store.capturedRoutes.value.length"
            class="grid min-h-0 flex-1 grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)] gap-4 overflow-hidden"
          >
            <TypegenRouteList
              :routes="store.capturedRoutes.value"
              :selected-id="store.selectedRoute.value?.id"
              @select="store.selectRoute"
              @open-file="openRouteFile"
            />
            <TypeWorkspace
              :preview="store.typePreview.value"
              :is-loading="store.isPreviewLoading.value"
              :save-result="store.lastSaveResult.value"
              :response-sample="store.selectedRoute.value?.lastResponseSample"
              :output-file="store.devtoolsConfig.value.typegen.outputFile"
              @save="store.saveTypePreview"
              @open="store.openGeneratedTypeFile"
            />
          </div>

          <!-- Empty state -->
          <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div class="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
              <FileCode2Icon :size="22" />
            </div>
            <p class="text-sm text-muted-foreground">No runtime responses captured yet.</p>
            <p class="max-w-xs text-[0.7rem] text-muted-foreground/60">
              Make requests using <code class="font-mono">endpoint-plus</code> in your app to
              capture response samples. Only routes with captured data appear here.
            </p>
          </div>
        </div>
      </Transition>
    </div>
  </main>
</template>
