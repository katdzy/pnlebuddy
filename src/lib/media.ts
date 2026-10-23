"use client";

/*
 * Cover photos she uploads. Images are too big for localStorage, so they live
 * in IndexedDB on this device, downscaled to a sensible banner size first.
 * They are not part of backups.
 */

import { useEffect, useState } from "react";

const DB_NAME = "pnlebuddy-media";
const STORE = "photos";
const MAX_WIDTH = 1800;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Downscale to MAX_WIDTH and re-encode as JPEG so a 12 MP photo becomes a few hundred KB. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read that image"))), "image/jpeg", 0.84),
  );
}

/** Saves a photo and returns its id. Throws if the image can't be read or stored. */
export async function savePhoto(file: File): Promise<string> {
  const blob = await shrink(file);
  const id = `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await run("readwrite", (s) => s.put(blob, id));
  return id;
}

export async function deletePhoto(id: string): Promise<void> {
  try {
    await run("readwrite", (s) => s.delete(id));
  } catch {
    /* already gone */
  }
}

/** Object URL for a stored photo, or null while loading / if it's missing. */
export function usePhotoUrl(id: string | null): string | null {
  const [state, setState] = useState<{ id: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let url: string | null = null;
    let live = true;
    run<Blob | undefined>("readonly", (s) => s.get(id) as IDBRequest<Blob | undefined>)
      .then((blob) => {
        if (!live) return;
        url = blob ? URL.createObjectURL(blob) : null;
        setState({ id, url });
      })
      .catch(() => live && setState({ id, url: null }));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return state && state.id === id ? state.url : null;
}
