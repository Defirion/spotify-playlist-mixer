export class MemoryManager {
  private static instance: MemoryManager;
  private memoryUsage = new Map<string, number>();
  private readonly maxMemoryMB = 100; // 100MB limit
  private readonly cleanupThreshold = 0.8; // Clean up when 80% full

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  trackMemoryUsage(key: string, sizeBytes: number): void {
    this.memoryUsage.set(key, sizeBytes);
    
    if (this.shouldCleanup()) {
      this.performCleanup();
    }
  }

  releaseMemory(key: string): void {
    this.memoryUsage.delete(key);
  }

  getCurrentUsageMB(): number {
    const totalBytes = Array.from(this.memoryUsage.values()).reduce((sum, size) => sum + size, 0);
    return totalBytes / (1024 * 1024);
  }

  private shouldCleanup(): boolean {
    return this.getCurrentUsageMB() > (this.maxMemoryMB * this.cleanupThreshold);
  }

  private performCleanup(): void {
    // Sort by size (largest first) and remove largest items
    const sortedEntries = Array.from(this.memoryUsage.entries())
      .sort(([, a], [, b]) => b - a);
    
    const targetSize = this.maxMemoryMB * 0.5; // Clean down to 50%
    let currentSize = this.getCurrentUsageMB();
    
    for (const [key] of sortedEntries) {
      if (currentSize <= targetSize) break;
      
      const size = this.memoryUsage.get(key) || 0;
      this.memoryUsage.delete(key);
      currentSize -= size / (1024 * 1024);
      
      // Trigger cleanup event for cache services
      this.notifyCleanup(key);
    }
  }

  private notifyCleanup(key: string): void {
    // Dispatch custom event for cache services to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('memory-cleanup', { detail: { key } }));
    }
  }

  getMemoryStats(): { usage: number; limit: number; entries: number } {
    return {
      usage: this.getCurrentUsageMB(),
      limit: this.maxMemoryMB,
      entries: this.memoryUsage.size
    };
  }
}

export const memoryManager = MemoryManager.getInstance();