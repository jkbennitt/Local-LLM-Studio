import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Model templates
export const modelTemplates = pgTable("model_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  modelType: text("model_type").notNull(), // 'gpt2-small', 'distilbert', 'tinybert'
  useCase: text("use_case").notNull(), // 'customer_service', 'creative_writing', 'code_assistant'
  config: jsonb("config").notNull(), // training configuration
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Training jobs
export const trainingJobs = pgTable("training_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  templateId: integer("template_id").references(() => modelTemplates.id),
  name: text("name").notNull(),
  status: text("status").notNull(), // 'pending', 'running', 'completed', 'failed'
  progress: integer("progress").default(0), // 0-100
  currentEpoch: integer("current_epoch").default(0),
  totalEpochs: integer("total_epochs").default(3),
  trainingLoss: text("training_loss"),
  datasetPath: text("dataset_path"),
  modelPath: text("model_path"),
  config: jsonb("config").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Datasets
export const datasets = pgTable("datasets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(), // 'csv', 'json', 'txt', 'pdf'
  sampleCount: integer("sample_count"),
  preprocessed: boolean("preprocessed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Trained models
export const trainedModels = pgTable("trained_models", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => trainingJobs.id),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  version: text("version").notNull(),
  modelPath: text("model_path").notNull(),
  performance: jsonb("performance"),
  deployed: boolean("deployed").default(false),
  apiEndpoint: text("api_endpoint"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema exports
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertModelTemplateSchema = createInsertSchema(modelTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingJobSchema = createInsertSchema(trainingJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDatasetSchema = createInsertSchema(datasets).omit({
  id: true,
  createdAt: true,
});

export const insertTrainedModelSchema = createInsertSchema(trainedModels).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ModelTemplate = typeof modelTemplates.$inferSelect;
export type InsertModelTemplate = z.infer<typeof insertModelTemplateSchema>;

export type TrainingJob = typeof trainingJobs.$inferSelect;
export type InsertTrainingJob = z.infer<typeof insertTrainingJobSchema>;

export type Dataset = typeof datasets.$inferSelect;
export type InsertDataset = z.infer<typeof insertDatasetSchema>;

export type TrainedModel = typeof trainedModels.$inferSelect;
export type InsertTrainedModel = z.infer<typeof insertTrainedModelSchema>;
