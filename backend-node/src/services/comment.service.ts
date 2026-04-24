import { CommentRepository } from '../repositories/comment.repository';

export class CommentService {
  constructor(private readonly commentRepo: CommentRepository) {}

  async getAllComments() {
    return this.commentRepo.getAll();
  }
}
