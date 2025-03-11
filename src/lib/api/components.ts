// src/lib/api/components.ts

import { Component } from "@prisma/client";


export interface CreateComponentInput {
  name: string;
  description?: string;
  data: Record<string, any>;
  type?: string;
  projectId: string;
  isPublic?: boolean;
}

export interface UpdateComponentInput extends Partial<Omit<CreateComponentInput, 'projectId'>> {
  id: string;
}

// Fetch all components with optional filtering
export const fetchComponents = async (filters?: {
  projectId?: string;
  type?: string;
  search?: string;
}): Promise<Component[]> => {
  try {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    if (filters?.projectId) queryParams.append('projectId', filters.projectId);
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.search) queryParams.append('search', filters.search);
    
    const queryString = queryParams.toString();
    const endpoint = `/api/components${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error('Failed to fetch components');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching components:', error);
    throw error;
  }
};

// Fetch components for a specific project
export const fetchProjectComponents = async (projectId: string): Promise<Component[]> => {
  try {
    const response = await fetch(`/api/projects/${projectId}/components`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch project components');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching components for project ${projectId}:`, error);
    throw error;
  }
};

// Fetch a single component by ID
export const fetchComponentById = async (id: string): Promise<Component> => {
  try {
    const response = await fetch(`/api/components/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch component');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching component ${id}:`, error);
    throw error;
  }
};

// Create a new component
export const createComponent = async (componentData: CreateComponentInput): Promise<Component> => {
  try {
    const response = await fetch('/api/components', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(componentData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create component');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating component:', error);
    throw error;
  }
};

// Create a new component in a specific project
export const createProjectComponent = async (
  projectId: string, 
  componentData: Omit<CreateComponentInput, 'projectId'>
): Promise<Component> => {
  try {
    const response = await fetch(`/api/projects/${projectId}/components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(componentData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create component');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error creating component in project ${projectId}:`, error);
    throw error;
  }
};

// Update an existing component
export const updateComponent = async ({ id, ...componentData }: UpdateComponentInput): Promise<Component> => {
  try {
    const response = await fetch(`/api/components/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(componentData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update component');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating component ${id}:`, error);
    throw error;
  }
};

// Delete a component
export const deleteComponent = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/components/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete component');
    }
  } catch (error) {
    console.error(`Error deleting component ${id}:`, error);
    throw error;
  }
};