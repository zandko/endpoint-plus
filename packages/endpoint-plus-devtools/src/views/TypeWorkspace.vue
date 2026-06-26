<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { useClipboard, whenever } from '@vueuse/core';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  ClipboardIcon,
  ExternalLinkIcon,
  FileCode2Icon,
  Loader2Icon,
  SaveIcon,
} from '@lucide/vue';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { cn } from '../utils';
import type { DevtoolsTypegenPreviewResult, DevtoolsTypegenSaveResult } from '../types';

const props = defineProps<{
  preview?: DevtoolsTypegenPreviewResult;
  isLoading?: boolean;
  saveResult?: DevtoolsTypegenSaveResult;
  outputFile: string;
  responseSample?: unknown;
}>();

const emit = defineEmits<{
  save: [overwrite?: boolean];
  open: [];
}>();

const confirmOverwriteOpen = shallowRef(false);

const responseSampleCode = computed(() =>
  props.responseSample !== undefined
    ? JSON.stringify(props.responseSample, null, 2)
    : '// No runtime response captured yet.\n// Make a request to this route in your app.',
);

const declarations = computed(() => props.preview?.declarations ?? '');
const { copy: copyCode, copied } = useClipboard({ source: declarations });

whenever(
  () => props.saveResult?.requiresConfirmation,
  () => {
    confirmOverwriteOpen.value = true;
  },
);

const canSave = computed(
  () => !!props.preview?.declarations && !props.isLoading && !props.preview?.error,
);
</script>

<template>
  <section
    class="flex min-h-0 flex-col overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border"
  >
    <!-- Header -->
    <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div>
        <p class="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Type generation
        </p>
        <h2
          class="max-w-[18rem] truncate font-mono text-xs font-semibold text-foreground"
          :title="outputFile"
        >
          {{ outputFile }}
        </h2>
      </div>

      <div class="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          class="h-7 gap-1.5 px-2 text-xs"
          :disabled="!preview || isLoading"
          @click="copyCode"
        >
          <component :is="copied ? ClipboardCheckIcon : ClipboardIcon" :size="13" />
          {{ copied ? 'Copied' : 'Copy' }}
        </Button>

        <Button
          variant="outline"
          size="sm"
          class="h-7 gap-1.5 px-2 text-xs"
          :disabled="!saveResult?.ok"
          @click="emit('open')"
        >
          <ExternalLinkIcon :size="13" />
          Open file
        </Button>

        <Button
          variant="default"
          size="sm"
          class="h-7 gap-1.5 px-2 text-xs"
          :disabled="!canSave"
          @click="emit('save', false)"
        >
          <Loader2Icon v-if="isLoading" :size="13" class="animate-spin" />
          <SaveIcon v-else :size="13" />
          Save types
        </Button>
      </div>
    </div>

    <!-- Route info bar -->
    <div
      v-if="preview"
      class="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2"
    >
      <Badge variant="secondary" class="gap-1 font-mono text-[0.65rem]">
        {{ preview.responseTypeName }}
      </Badge>
      <span
        v-if="preview.rootTypeName !== preview.responseTypeName"
        class="text-[0.65rem] text-muted-foreground"
      >
        → <code class="font-mono">{{ preview.rootTypeName }}</code>
      </span>
      <Badge v-if="preview.error" variant="destructive" class="ml-auto text-[0.6rem]">
        generation error
      </Badge>
    </div>

    <!-- Save result bar -->
    <div
      v-if="saveResult"
      :class="
        cn(
          'flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 text-xs',
          saveResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
        )
      "
    >
      <CheckCircle2Icon v-if="saveResult.ok" :size="12" />
      <AlertTriangleIcon v-else :size="12" />
      <span>{{ saveResult.message }}</span>
      <code class="ml-auto font-mono text-[0.6rem] opacity-60">{{ saveResult.action }}</code>
    </div>

    <!-- Code panels -->
    <div class="relative min-h-0 flex-1 overflow-hidden">
      <!-- Loading overlay -->
      <Transition name="fade">
        <div
          v-if="isLoading"
          class="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm"
        >
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2Icon :size="14" class="animate-spin" />
            Generating types…
          </div>
        </div>
      </Transition>

      <!-- Error state -->
      <div
        v-if="preview?.error"
        class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <div class="grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangleIcon :size="18" />
        </div>
        <p class="text-xs text-destructive">{{ preview.error }}</p>
      </div>

      <!-- Two-panel layout -->
      <div
        v-else-if="preview || responseSample !== undefined"
        class="grid h-full grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden lg:grid-cols-2 lg:grid-rows-1"
      >
        <!-- JSON sample -->
        <div
          class="flex min-h-0 flex-col overflow-hidden border-b border-border lg:border-b-0 lg:border-r"
        >
          <div class="flex shrink-0 items-center px-4 py-1.5" style="background: var(--code-bg)">
            <span class="font-mono text-[0.6rem] opacity-40" style="color: var(--code-fg)">
              response sample · JSON
            </span>
          </div>
          <pre
            class="code-block min-h-0 flex-1 overflow-auto px-5 pb-5 pt-3 font-mono text-xs leading-relaxed"
            style="background: var(--code-bg); color: var(--code-fg)"
            >{{ responseSampleCode }}</pre
          >
        </div>

        <!-- Generated declarations -->
        <div class="flex min-h-0 flex-col overflow-hidden">
          <div class="flex shrink-0 items-center px-4 py-1.5" style="background: var(--code-bg)">
            <span class="font-mono text-[0.6rem] opacity-40" style="color: var(--code-fg)">
              generated types · TypeScript · quicktype
            </span>
          </div>
          <pre
            class="code-block min-h-0 flex-1 overflow-auto px-5 pb-5 pt-3 font-mono text-xs leading-relaxed"
            style="background: var(--code-bg); color: var(--code-fg)"
            >{{ declarations }}</pre
          >
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div class="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
          <FileCode2Icon :size="18" />
        </div>
        <p class="text-xs text-muted-foreground">
          Select a route to generate types.<br />
          <span class="text-[0.68rem]">
            Types are saved to <code class="font-mono">{{ outputFile }}</code
            >.
          </span>
        </p>
      </div>
    </div>

    <!-- Overwrite confirmation dialog -->
    <Dialog v-model:open="confirmOverwriteOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-sm">
            <AlertTriangleIcon :size="16" class="text-amber-500" />
            Overwrite existing generated type?
          </DialogTitle>
          <DialogDescription>
            This route already exists in <code class="font-mono">{{ outputFile }}</code
            >. Confirming will replace the generated interface and rebuild the route declaration
            block.
          </DialogDescription>
        </DialogHeader>
        <div v-if="preview" class="rounded-md border bg-muted px-3 py-2 font-mono text-xs">
          {{ preview.responseTypeName }} → {{ preview.rootTypeName }}
        </div>
        <DialogFooter>
          <Button variant="outline" @click="confirmOverwriteOpen = false">Cancel</Button>
          <Button
            variant="default"
            @click="
              confirmOverwriteOpen = false;
              emit('save', true);
            "
          >
            Overwrite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
