// src/pages/QuizListPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Container, Section, PageHeader } from '../components/layout';
import { Button } from '../components/ui';
import { LoadingState, ErrorState, EmptyState } from '../components/feedback';
import { QuizCard } from '../components/quiz';
import { quizzesApi } from '../services/api';
import { QuizSummary } from '../types';
import { PaginatedResponse } from '../types/api';

const QuizListPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInputValue, setSearchInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedYearLevel, setSelectedYearLevel] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(9); // 3x3 grid on large screens
  
  // Performance monitoring
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      console.log(`QuizListPage render time: ${endTime - startTime}ms`);
    };
  }, []);
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInputValue);
      setCurrentPage(1); // Reset to first page on new search
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [searchInputValue]);
  
  // Fetch quizzes with proper error handling
  const fetchQuizzes = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response: PaginatedResponse<QuizSummary> = await quizzesApi.getQuizzes({
        subject: selectedSubject || undefined,
        yearLevel: selectedYearLevel || undefined,
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined
      });
      
      setQuizzes(response.items);
      setTotalPages(response.totalPages);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
      setError('Unable to load quizzes. Please try again later.');
      setQuizzes([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject, selectedYearLevel, currentPage, itemsPerPage, searchTerm]);
  
  // Trigger fetch when dependencies change
  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);
  
  // Filter reset handler
  const handleClearFilters = () => {
    setSearchInputValue('');
    setSearchTerm('');
    setSelectedSubject(null);
    setSelectedYearLevel(null);
    setCurrentPage(1);
  };
  
  // Quiz selection handler
  const handleQuizSelect = (quizId: string) => {
    navigate(`/quizzes/${quizId}`);
  };
  
  // Pagination component
  const Pagination = () => {
    if (totalPages <= 1) return null;
    
    // Calculate page range for larger pagination sets
    const displayPageCount = 5;
    let startPage = Math.max(1, currentPage - Math.floor(displayPageCount / 2));
    const endPage = Math.min(totalPages, startPage + displayPageCount - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < displayPageCount) {
      startPage = Math.max(1, endPage - displayPageCount + 1);
    }
    
    const pageNumbers = Array.from(
      { length: endPage - startPage + 1 }, 
      (_, i) => startPage + i
    );
    
    return (
      <div className="mt-8 flex justify-center">
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          {/* Previous button */}
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium"
          >
            <span className="sr-only">Previous</span>
            &larr;
          </Button>
          
          {/* First page & ellipsis */}
          {startPage > 1 && (
            <>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(1)}
                className="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
              >
                1
              </Button>
              {startPage > 2 && (
                <span className="relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                  ...
                </span>
              )}
            </>
          )}
          
          {/* Page numbers */}
          {pageNumbers.map(page => (
            <Button
              key={page}
              variant={page === currentPage ? "primary" : "outline"}
              onClick={() => setCurrentPage(page)}
              className="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
            >
              {page}
            </Button>
          ))}
          
          {/* Last page & ellipsis */}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <span className="relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                  ...
                </span>
              )}
              <Button
                variant="outline"
                onClick={() => setCurrentPage(totalPages)}
                className="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
              >
                {totalPages}
              </Button>
            </>
          )}
          
          {/* Next button */}
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium"
          >
            <span className="sr-only">Next</span>
            &rarr;
          </Button>
        </nav>
      </div>
    );
  };

  return (
    <Layout title="Browse Quizzes">
      <PageHeader 
        title="Browse Quizzes" 
        subtitle="Discover and take quizzes to test your medical knowledge"
      />
      
      <Container>
        <Section>
          {/* Filters and search implementation */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchInputValue}
                  onChange={(e) => setSearchInputValue(e.target.value)}
                  aria-label="Search quizzes"
                />
              </div>
              
              {/* Subject filter dropdown */}
              <div className="w-full md:w-48">
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedSubject || ''}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value || null);
                    setCurrentPage(1); // Reset to first page on filter change
                  }}
                  aria-label="Filter by subject"
                >
                  <option value="">All Subjects</option>
                  <option value="Anatomy">Anatomy</option>
                  <option value="Physiology">Physiology</option>
                  <option value="Pathology">Pathology</option>
                  <option value="Pharmacology">Pharmacology</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Surgery">Surgery</option>
                </select>
              </div>
              
              {/* Year level filter dropdown */}
              <div className="w-full md:w-48">
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedYearLevel || ''}
                  onChange={(e) => {
                    setSelectedYearLevel(e.target.value ? parseInt(e.target.value) : null);
                    setCurrentPage(1); // Reset to first page on filter change
                  }}
                  aria-label="Filter by year level"
                >
                  <option value="">All Year Levels</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                  <option value="5">Year 5</option>
                </select>
              </div>
              
              {/* Clear filters button */}
              {(searchTerm || selectedSubject || selectedYearLevel) && (
                <div className="w-full md:w-auto">
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="w-full md:w-auto"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Loading state */}
          {isLoading && <LoadingState message="Loading quizzes..." />}

          {/* Error state */}
          {!isLoading && error && (
            <ErrorState
              title="Error Loading Quizzes"
              description={error}
              buttonText="Try Again"
              onAction={fetchQuizzes}
            />
          )}

          {/* Empty state */}
          {!isLoading && !error && quizzes.length === 0 && (
            <EmptyState
              title="No Quizzes Found"
              description={searchTerm || selectedSubject || selectedYearLevel
                ? "No quizzes match your search criteria. Try different keywords or clear filters." 
                : "There are no quizzes available yet."}
              buttonText={searchTerm || selectedSubject || selectedYearLevel ? "Clear Filters" : undefined}
              onAction={searchTerm || selectedSubject || selectedYearLevel ? handleClearFilters : undefined}
            />
          )}

          {/* Quiz grid */}
          {!isLoading && !error && quizzes.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map((quiz) => (
                  <QuizCard 
                    key={quiz.id}
                    quiz={quiz}
                    onClick={() => handleQuizSelect(quiz.id)}
                  />
                ))}
              </div>
              
              {/* Pagination component */}
              <Pagination />
            </>
          )}
        </Section>
      </Container>
    </Layout>
  );
};

export default QuizListPage;