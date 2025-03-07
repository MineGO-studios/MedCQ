// src/pages/QuizListPage.tsx

import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Container, Section, PageHeader } from '../components/layout';
import { Card, CardBody } from '../components/ui';
import { LoadingState, ErrorState, EmptyState } from '../components/feedback';
import { quizzesApi } from '../services/api';
import { QuizSummary } from '../types';
import { Button } from '../components/ui';
import { PaginatedResponse } from '../types/api';

const QuizListPage: React.FC = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedYearLevel, setSelectedYearLevel] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(9); // 3x3 grid on large screens
  const [searchInputValue, setSearchInputValue] = useState('');

  // Fetch quizzes data
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setIsLoading(true);
        const response: PaginatedResponse<QuizSummary> = await quizzesApi.getQuizzes({
          subject: selectedSubject || undefined,
          yearLevel: selectedYearLevel || undefined,
          page: currentPage,
          limit: itemsPerPage,
        });

        setQuizzes(response.items);
        setTotalPages(response.totalPages);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch quizzes:', err);
        setError('Unable to load quizzes. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzes();
  }, [selectedSubject, selectedYearLevel, currentPage, itemsPerPage]);

  // Add pagination controls
  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="mt-8 flex justify-center">
        <nav
          className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
          aria-label="Pagination"
        >
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium"
          >
            <span className="sr-only">Previous</span>
            &larr;
          </Button>

          {/* Display page numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={page === currentPage ? 'primary' : 'outline'}
              onClick={() => setCurrentPage(page)}
              className="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
            >
              {page}
            </Button>
          ))}

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInputValue);
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [searchInputValue]);
  
  // Update the search input
  <input
    type="text"
    placeholder="Search quizzes..."
    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    value={searchInputValue}
    onChange={(e) => setSearchInputValue(e.target.value)}
  />

  useEffect(() => {
    // Log initial load
    const startTime = performance.now();
    
    return () => {
      // Log component unmount/reload
      const endTime = performance.now();
      console.log(`QuizListPage render time: ${endTime - startTime}ms`);
    };
  }, []);

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
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Subject filter dropdown */}
              <div className="w-full md:w-48">
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedSubject || ''}
                  onChange={e => setSelectedSubject(e.target.value || null)}
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
                  onChange={e =>
                    setSelectedYearLevel(e.target.value ? parseInt(e.target.value) : null)
                  }
                >
                  <option value="">All Year Levels</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                  <option value="5">Year 5</option>
                </select>
              </div>
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
              onAction={() => window.location.reload()}
            />
          )}

          {/* Empty state */}
          {!isLoading && !error && filteredQuizzes.length === 0 && (
            <EmptyState
              title="No Quizzes Found"
              description={
                searchTerm
                  ? 'No quizzes match your search criteria. Try different keywords or clear filters.'
                  : 'There are no quizzes available yet.'
              }
              buttonText={searchTerm ? 'Clear Filters' : undefined}
              onAction={
                searchTerm
                  ? () => {
                      setSearchTerm('');
                      setSelectedSubject(null);
                      setSelectedYearLevel(null);
                    }
                  : undefined
              }
            />
          )}

          {/* Quiz grid */}
          {!isLoading && !error && filteredQuizzes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map(quiz => (
                <QuizCard key={quiz.id} quiz={quiz} onClick={() => handleQuizSelect(quiz.id)} />
              ))}
            </div>
          )}
          {!isLoading && !error && filteredQuizzes.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredQuizzes.map(quiz => (
                  <QuizCard key={quiz.id} quiz={quiz} onClick={() => handleQuizSelect(quiz.id)} />
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
