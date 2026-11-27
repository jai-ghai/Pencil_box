"use client";

export interface InstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let current: InstallPrompt | null = null;
const listeners = new Set<() => void>();

export function publishInstallPrompt(next: InstallPrompt | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

export function getInstallPrompt(): InstallPrompt | null {
  return current;
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
