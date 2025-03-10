// src/services/cacheService.ts
export interface CacheOptions {
    ttl: number; // Time-to-live in seconds
    maxSize: number; // Maximum items in cache
  }
  
  export class RequestCache {
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private readonly options: CacheOptions;
  
    constructor(options: Partial<CacheOptions> = {}) {
      this.options = {
        ttl: options.ttl || 300, // 5 minutes default
        maxSize: options.maxSize || 100
      };
    }
  
    /**
     * Get cached data or fetch fresh data
     */
    async getOrFetch<T>(
      key: string, 
      fetchFn: () => Promise<T>, 
      options?: Partial<CacheOptions>
    ): Promise<T> {
      const ttl = options?.ttl || this.options.ttl;
      const cached = this.cache.get(key);
      
      // Return cached data if valid
      if (cached && Date.now() - cached.timestamp < ttl * 1000) {
        return cached.data;
      }
      
      // Fetch fresh data
      const data = await fetchFn();
      
      // Cache the results
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });
      
      // Maintain cache size
      if (this.cache.size > this.options.maxSize) {
        // Remove oldest entry
        const oldestKey = Array.from(this.cache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
        this.cache.delete(oldestKey);
      }
      
      return data;
    }
  
    /**
     * Invalidate specific cache entries by key prefix
     */
    invalidateByPrefix(keyPrefix: string): void {
      for (const key of this.cache.keys()) {
        if (key.startsWith(keyPrefix)) {
          this.cache.delete(key);
        }
      }
    }
    
    /**
     * Clear the entire cache
     */
    clear(): void {
      this.cache.clear();
    }
  }
  
  // Create singleton instance
  export const apiCache = new RequestCache();
  
  // Usage example in API service
  import { apiCache } from './cacheService';
  
  // Modify quizzesApi to use caching
  export const quizzesApi = {
    async getQuizzes(params?: QueryParams): Promise<PaginatedResponse<QuizSummary>> {
      // Create cache key from params
      const queryString = new URLSearchParams(
        params ? Object.entries(params).map(([k, v]) => [k, String(v)]) : []
      ).toString();
      const cacheKey = `quizzes:list:${queryString}`;
      
      return apiCache.getOrFetch(
        cacheKey,
        async () => {
          // Original API call logic
          const response = await apiClient.get(`/quizzes?${queryString}`);
          return response.data;
        },
        { ttl: 60 } // 1 minute TTL for quiz lists
      );
    },
    
    async getQuiz(quizId: string): Promise<Quiz> {
      const cacheKey = `quizzes:detail:${quizId}`;
      
      return apiCache.getOrFetch(
        cacheKey,
        async () => {
          const response = await apiClient.get(`/quizzes/${quizId}`);
          return response.data;
        },
        { ttl: 300 } // 5 minutes TTL for quiz details
      );
    }
    
    // Invalidate relevant caches when updating quiz
    async updateQuiz(quizId: string, quizData: Partial<Quiz>): Promise<Quiz> {
      const response = await apiClient.put(`/quizzes/${quizId}`, quizData);
      
      // Invalidate both the specific quiz and the lists
      apiCache.invalidateByPrefix(`quizzes:detail:${quizId}`);
      apiCache.invalidateByPrefix('quizzes:list:');
      
      return response.data;
    }
  };