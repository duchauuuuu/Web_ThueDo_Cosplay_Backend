import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo bình luận mới' })
  @ApiResponse({ status: 201, description: 'Tạo bình luận thành công' })
  create(@CurrentUser() user: any, @Body() createCommentDto: CreateCommentDto) {
    return this.commentsService.create(user.id, createCommentDto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Lấy danh sách bình luận theo sản phẩm' })
  findByProduct(@Param('productId') productId: string) {
    return this.commentsService.findByProduct(productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin bình luận theo ID' })
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật bình luận' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.update(id, user.id, updateCommentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa bình luận' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.commentsService.remove(id, user.id);
  }

  @Get('product/:productId/rating')
  @ApiOperation({ summary: 'Lấy điểm đánh giá trung bình của sản phẩm' })
  getAverageRating(@Param('productId') productId: string) {
    return this.commentsService.getAverageRating(productId);
  }
}

