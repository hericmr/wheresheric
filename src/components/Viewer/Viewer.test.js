import { render, screen, waitFor, act } from '@testing-library/react';
import Viewer from './index';
import { supabase } from '../../supabaseClient';
import { cityCameras } from '../../cityCameras';
import { calculateDistance } from '../../utils/calculateDistance';

// Mock supabase and calculateDistance
jest.mock('../../supabaseClient', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    })),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }))
    }))
  },
}));

jest.mock('../../utils/calculateDistance');

describe('Viewer Component - Proximity Feature', () => {
  beforeEach(() => {
    // Reset mocks before each test
    supabase.channel.mockClear();
    calculateDistance.mockClear();
    supabase.from.mockClear();
  });

  test('should display FullScreenImage when Heric is in proximity of a camera', async () => {
    // Mock calculateDistance to return a distance within the threshold
    calculateDistance.mockReturnValue(10); // 10 meters, which is < PROXIMITY_THRESHOLD (50m)

    // Mock initial location data from Supabase
    supabase.channel().on().subscribe.mockImplementationOnce((callback) => {
      callback({ new: { lat: cityCameras[0].lat, lng: cityCameras[0].lng, created_at: new Date().toISOString() } });
    });

    render(<Viewer />);

    // Wait for the FullScreenImage to appear
    await waitFor(() => {
      expect(screen.getByAltText(cityCameras[0].name)).toBeInTheDocument();
    });

    // Assert that the FullScreenImage is displayed with the correct image URL and title
    const fullScreenImage = screen.getByAltText(cityCameras[0].name);
    expect(fullScreenImage).toHaveAttribute('src', cityCameras[0].link);
  });

  test('should not display FullScreenImage when Heric is not in proximity of any camera', async () => {
    // Mock calculateDistance to return a distance outside the threshold
    calculateDistance.mockReturnValue(100); // 100 meters, which is > PROXIMITY_THRESHOLD (50m)

    // Mock initial location data from Supabase
    supabase.channel().on().subscribe.mockImplementationOnce((callback) => {
      callback({ new: { lat: 0, lng: 0, created_at: new Date().toISOString() } });
    });

    render(<Viewer />);

    // Assert that the FullScreenImage is NOT displayed
    await waitFor(() => {
      expect(screen.queryByAltText(/Câmera/i)).not.toBeInTheDocument();
    }, { timeout: 2000 }); // Increased timeout for assertion
  });

  test('should activate camera grid when target moves into camera coverage area', async () => {
    // Mock cameras with coverage areas
    const mockCameras = [
      {
        id: '1',
        name: 'Câmera Centro',
        lat: -22.9035,
        lng: -43.2096,
        link: 'https://example.com/camera1.jpg',
        coverage_area: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-43.2106, -22.9045],
              [-43.2086, -22.9045],
              [-43.2086, -22.9025],
              [-43.2106, -22.9025],
              [-43.2106, -22.9045]
            ]]
          }
        }
      }
    ];

    // Mock Supabase to return cameras
    supabase.from.mockImplementation((table) => {
      if (table === 'cameras') {
        return {
          select: jest.fn(() => Promise.resolve({ data: mockCameras, error: null }))
        };
      }
      return {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      };
    });

    // Mock calculateDistance for fallback proximity detection
    calculateDistance.mockReturnValue(30); // Within threshold

    let locationCallback;
    supabase.channel().on().subscribe.mockImplementation((callback) => {
      locationCallback = callback;
      return { subscribe: jest.fn() };
    });

    render(<Viewer />);

    // Initial position - outside coverage area
    await act(async () => {
      locationCallback({ 
        new: { 
          lat: -22.9065, // Outside polygon
          lng: -43.2126, 
          created_at: new Date().toISOString() 
        } 
      });
    });

    // Wait a bit for processing
    await waitFor(() => {
      expect(screen.queryByText(/Câmeras Ativas/)).not.toBeInTheDocument();
    }, { timeout: 1000 });

    // Move target into coverage area
    await act(async () => {
      locationCallback({ 
        new: { 
          lat: -22.9035, // Inside polygon
          lng: -43.2096, 
          created_at: new Date().toISOString() 
        } 
      });
    });

    // Wait for camera grid to appear
    await waitFor(() => {
      expect(screen.getByText(/Câmeras Ativas/)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Verify camera is displayed in grid
    await waitFor(() => {
      expect(screen.getByText('Câmera Centro')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('should deactivate camera grid when target moves out of coverage area', async () => {
    // Mock cameras with coverage areas
    const mockCameras = [
      {
        id: '1',
        name: 'Câmera Centro',
        lat: -22.9035,
        lng: -43.2096,
        link: 'https://example.com/camera1.jpg',
        coverage_area: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-43.2106, -22.9045],
              [-43.2086, -22.9045],
              [-43.2086, -22.9025],
              [-43.2106, -22.9025],
              [-43.2106, -22.9045]
            ]]
          }
        }
      }
    ];

    // Mock Supabase to return cameras
    supabase.from.mockImplementation((table) => {
      if (table === 'cameras') {
        return {
          select: jest.fn(() => Promise.resolve({ data: mockCameras, error: null }))
        };
      }
      return {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      };
    });

    // Mock calculateDistance for fallback proximity detection
    calculateDistance.mockReturnValue(30); // Within threshold initially

    let locationCallback;
    supabase.channel().on().subscribe.mockImplementation((callback) => {
      locationCallback = callback;
      return { subscribe: jest.fn() };
    });

    render(<Viewer />);

    // Start inside coverage area
    await act(async () => {
      locationCallback({ 
        new: { 
          lat: -22.9035, // Inside polygon
          lng: -43.2096, 
          created_at: new Date().toISOString() 
        } 
      });
    });

    // Wait for camera grid to appear
    await waitFor(() => {
      expect(screen.getByText(/Câmeras Ativas/)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Change distance to outside threshold
    calculateDistance.mockReturnValue(100); // Outside threshold

    // Move target outside coverage area
    await act(async () => {
      locationCallback({ 
        new: { 
          lat: -22.9065, // Outside polygon
          lng: -43.2126, 
          created_at: new Date().toISOString() 
        } 
      });
    });

    // Wait for camera grid to disappear
    await waitFor(() => {
      expect(screen.queryByText(/Câmeras Ativas/)).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('should handle multiple cameras in coverage area', async () => {
    // Mock multiple cameras with overlapping coverage areas
    const mockCameras = [
      {
        id: '1',
        name: 'Câmera Centro',
        lat: -22.9035,
        lng: -43.2096,
        link: 'https://example.com/camera1.jpg',
        coverage_area: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-43.2106, -22.9045],
              [-43.2086, -22.9045],
              [-43.2086, -22.9025],
              [-43.2106, -22.9025],
              [-43.2106, -22.9045]
            ]]
          }
        }
      },
      {
        id: '2',
        name: 'Câmera Lateral',
        lat: -22.9035,
        lng: -43.2096,
        link: 'https://example.com/camera2.jpg',
        coverage_area: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-43.2116, -22.9055],
              [-43.2096, -22.9055],
              [-43.2096, -22.9035],
              [-43.2116, -22.9035],
              [-43.2116, -22.9055]
            ]]
          }
        }
      }
    ];

    // Mock Supabase to return cameras
    supabase.from.mockImplementation((table) => {
      if (table === 'cameras') {
        return {
          select: jest.fn(() => Promise.resolve({ data: mockCameras, error: null }))
        };
      }
      return {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      };
    });

    // Mock calculateDistance for fallback proximity detection
    calculateDistance.mockReturnValue(25); // Within threshold for both

    let locationCallback;
    supabase.channel().on().subscribe.mockImplementation((callback) => {
      locationCallback = callback;
      return { subscribe: jest.fn() };
    });

    render(<Viewer />);

    // Move target into overlapping coverage area
    await act(async () => {
      locationCallback({ 
        new: { 
          lat: -22.9045, // Inside both polygons
          lng: -43.2106, 
          created_at: new Date().toISOString() 
        } 
      });
    });

    // Wait for camera grid to appear with multiple cameras
    await waitFor(() => {
      expect(screen.getByText(/Câmeras Ativas \(2\)/)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Verify both cameras are displayed
    await waitFor(() => {
      expect(screen.getByText('Câmera Centro')).toBeInTheDocument();
      expect(screen.getByText('Câmera Lateral')).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});
