import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { AnalyzeService } from "../services/analyze.service.js";

interface UploadedMemoryFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

interface AnalyzeBody {
  text?: string;
  selectedTypeId?: string;
  consentToExternalAI?: boolean | string;
  userId?: string;
}

@Controller("chat")
export class ChatController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  @Post("analyze")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: memoryStorage(),
      limits: {
        fileSize: 6 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith("image/")) {
          callback(new BadRequestException("이미지 파일만 업로드할 수 있어요."), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async analyze(
    @Body() body: AnalyzeBody,
    @UploadedFile() image?: UploadedMemoryFile,
  ) {
    const hasText = typeof body.text === "string" && body.text.trim().length > 0;
    const hasSelectedType = typeof body.selectedTypeId === "string" && body.selectedTypeId.length > 0;

    if (!hasText && !image && !hasSelectedType) {
      throw new BadRequestException("텍스트, 이미지, 직접 선택 유형 중 하나는 필요해요.");
    }

    const consentToExternalAI = body.consentToExternalAI === true || body.consentToExternalAI === "true";

    if (image && !consentToExternalAI) {
      throw new BadRequestException("이미지 분석에는 외부 AI 전송 동의가 필요해요.");
    }

    return this.analyzeService.analyze({
      request: {
        text: body.text,
        selectedTypeId: body.selectedTypeId,
        consentToExternalAI,
        userId: body.userId,
      },
      image,
    });
  }
}
