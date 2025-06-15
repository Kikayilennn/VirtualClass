// Mock service for Google Meet functionality
const meetService = {
  // Mock function to create a new meeting link
  async createMeetLink() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    // Generate a mock Google Meet link
    return `https://meet.google.com/${Math.random().toString(36).substring(2, 15)}`;
  },

  // Mock function to get the current meeting link
  async getMeetLink() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    // Return a mock link or null
    return Math.random() > 0.5 ? `https://meet.google.com/${Math.random().toString(36).substring(2, 15)}` : null;
  }
};

export { meetService };
