import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ExamClient from './ExamClient';
import { SocketContext } from '@/context/SocketContext';
import '@testing-library/jest-dom';

// Mock Socket
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  off: jest.fn(),
};

const renderWithSocket = (ui) => {
  return render(
    <SocketContext.Provider value={{ socket: mockSocket, isConnected: true }}>
      {ui}
    </SocketContext.Provider>
  );
};

describe('ExamClient Real-time Stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state when exam type is completed but results are missing', () => {
    // Mock initial state via props or by manipulating the component logic if possible. 
    // Since ExamClient manages its own state via socket events, we need to simulate socket events.
    
    renderWithSocket(<ExamClient />);

    // Simulate active exam types received
    const activeExamTypesHandler = mockSocket.on.mock.calls.find(call => call[0] === 'active-exam-types')[1];
    activeExamTypesHandler([{ _id: 'exam1', name: 'Test Exam', questionCount: 10 }]);

    // Simulate progress update: Completed but NO result
    const progressHandler = mockSocket.on.mock.calls.find(call => call[0] === 'student-exam-progress')[1];
    progressHandler({
      'exam1': {
        status: 'completed',
        answeredCount: 10,
        totalQuestions: 10,
        result: null // Missing result
      }
    });

    // Check for "Hesablanır..." loading text
    expect(screen.getByText('Hesablanır...')).toBeInTheDocument();
  });

  test('renders stats when result is available', async () => {
    renderWithSocket(<ExamClient />);

    // Simulate active exam types
    const activeExamTypesHandler = mockSocket.on.mock.calls.find(call => call[0] === 'active-exam-types')[1];
    activeExamTypesHandler([{ _id: 'exam1', name: 'Test Exam', questionCount: 10 }]);

    // Simulate stats arrival via exam-type-stats event
    const statsHandler = mockSocket.on.mock.calls.find(call => call[0] === 'exam-type-stats')[1];
    statsHandler({
      examTypeId: 'exam1',
      stats: {
        correctCount: 8,
        wrongCount: 2,
        emptyCount: 0,
        score: 80
      }
    });

    // Also need to set status to completed if not already (stats usually come after finish)
    // But rendering logic checks `isCompleted`. 
    // So we need to ensure progress status is 'completed' too.
    const progressHandler = mockSocket.on.mock.calls.find(call => call[0] === 'student-exam-progress')[1];
    progressHandler({
      'exam1': {
        status: 'completed',
        answeredCount: 10,
        totalQuestions: 10,
        result: { // Or we can rely on the statsHandler update if it merges correctly
             correctCount: 8,
             wrongCount: 2,
             emptyCount: 0,
             score: 80
        }
      }
    });

    // Check for stats
    await waitFor(() => {
        expect(screen.getByText('Doğru')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument(); // Correct count
        expect(screen.getByText('Səhv')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Wrong count
    });
  });

  test('retries fetching stats if stuck in loading state', async () => {
     jest.useFakeTimers();
     renderWithSocket(<ExamClient />);

     // Simulate exam type and completed status without result
     const activeExamTypesHandler = mockSocket.on.mock.calls.find(call => call[0] === 'active-exam-types')[1];
     activeExamTypesHandler([{ _id: 'exam1', name: 'Test Exam', questionCount: 10 }]);

     const progressHandler = mockSocket.on.mock.calls.find(call => call[0] === 'student-exam-progress')[1];
     progressHandler({
       'exam1': {
         status: 'completed',
         answeredCount: 10,
         totalQuestions: 10,
         result: null
       }
     });

     // Fast-forward time
     jest.advanceTimersByTime(3000);

     // Check if socket.emit was called with 'get-active-exam-types'
     expect(mockSocket.emit).toHaveBeenCalledWith('get-active-exam-types');
     
     jest.useRealTimers();
  });
});
