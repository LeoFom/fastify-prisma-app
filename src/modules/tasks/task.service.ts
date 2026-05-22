import { TaskRepository } from './task.repository'

export class TaskService {
  private repository = new TaskRepository()

  async createTask(userId: string, data: any) {
    return this.repository.create(userId, data)
  }

  async getTasks(userId: string) {
    return this.repository.findAll(userId)
  }
}