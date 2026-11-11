import { z } from 'zod'

const taskStatus = z.enum(['pending', 'completed'])
const taskPriority = z.enum(['low', 'medium', 'high'])
const dueDate = z.union([
  z.iso.date(),
  z.null(),
]).optional()

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(3000).optional().default(''),
  priority: taskPriority.optional().default('medium'),
  category: z.string().trim().max(60).optional().default(''),
  due_date: dueDate,
  status: taskStatus.optional().default('pending'),
}).strict()

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().max(3000).optional(),
  priority: taskPriority.optional(),
  category: z.string().trim().max(60).optional(),
  due_date: dueDate,
  status: taskStatus.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.')

export const noteCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().max(30000).optional().default(''),
  category: z.string().trim().max(60).optional().default(''),
  is_pinned: z.boolean().optional().default(false),
}).strict()

export const noteUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  content: z.string().max(30000).optional(),
  category: z.string().trim().max(60).optional(),
  is_pinned: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.')

export const idSchema = z.uuid()
