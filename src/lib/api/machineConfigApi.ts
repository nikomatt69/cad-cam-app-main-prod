// src/lib/api/machineConfigApi.ts

import { fetchWithErrorHandling } from "./apiUtils";


export interface MachineConfig {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  config: any;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}

export interface CreateMachineConfigDto {
  name: string;
  description?: string;
  type: 'mill' | 'lathe' | 'printer' | 'laser';
  config: any;
  organizationId?: string;
  isPublic?: boolean;
}

export interface UpdateMachineConfigDto {
  name?: string;
  description?: string | null;
  type?: 'mill' | 'lathe' | 'printer' | 'laser';
  config?: any;
  isPublic?: boolean;
}

export interface MachineConfigFilters {
  type?: string;
  search?: string;
  public?: boolean;
}

/**
 * Get all machine configurations with optional filters
 */
export async function getMachineConfigs(filters?: MachineConfigFilters): Promise<MachineConfig[]> {
  const queryParams = new URLSearchParams();
  
  if (filters?.type) queryParams.append('type', filters.type);
  if (filters?.search) queryParams.append('search', filters.search);
  if (filters?.public) queryParams.append('public', 'true');
  
  const url = `/api/machine-configs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return fetchWithErrorHandling(url);
}

/**
 * Get a specific machine configuration by ID
 */
export async function getMachineConfigById(id: string): Promise<MachineConfig> {
  return fetchWithErrorHandling(`/api/machine-configs/${id}`);
}

/**
 * Create a new machine configuration
 */
export async function createMachineConfig(data: CreateMachineConfigDto): Promise<MachineConfig> {
  return fetchWithErrorHandling('/api/machine-configs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing machine configuration
 */
export async function updateMachineConfig(id: string, data: UpdateMachineConfigDto): Promise<MachineConfig> {
  return fetchWithErrorHandling(`/api/machine-configs/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

/**
 * Delete a machine configuration
 */
export async function deleteMachineConfig(id: string): Promise<void> {
  return fetchWithErrorHandling(`/api/machine-configs/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Export machine configurations
 */
export async function exportMachineConfigs(ids?: string[], format: 'json' | 'zip' | 'bucket' = 'json'): Promise<any> {
  const queryParams = new URLSearchParams();
  
  if (format) queryParams.append('format', format);
  if (ids && ids.length > 0) {
    ids.forEach(id => queryParams.append('ids', id));
  }
  
  const url = `/api/machine-configs/export-import?${queryParams.toString()}`;
  return fetchWithErrorHandling(url);
}

/**
 * Import machine configurations
 */
export async function importMachineConfigs(
  data: any,
  importMode: 'create' | 'update' | 'skip' = 'create',
  organizationId?: string
): Promise<any> {
  return fetchWithErrorHandling('/api/machine-configs/export-import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data,
      importMode,
      organizationId,
    }),
  });
}