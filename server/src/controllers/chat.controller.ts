import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { memoryStorage } from "multer";

import { RateLimitService } from "../security/rate-limit.js";
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
}

const MAX_TEXT_LENGTH = 2_000;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

@Controller("chat")
export class ChatController {
  constructor(
    private readonly analyzeService: AnalyzeService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post("analyze")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: memoryStorage(),
      limits: {
        fileSize: 6 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        if (!allowedImageTypes.has(file.mimetype)) {
          callback(new BadRequestException("이미지 파일만 업로드할 수 있어요."), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async analyze(
    @Body() body: AnalyzeBody,
    @Req() request: Request,
    @UploadedFile() image?: UploadedMemoryFile,
  ) {
    this.rateLimitService.assertAllowed({
      key: this.getClientIp(request),
      scope: "chat-analyze",
      maxRequests: 20,
      windowMs: 60_000,
    });

    const hasText = typeof body.text === "string" && body.text.trim().length > 0;
    const hasSelectedType = typeof body.selectedTypeId === "string" && body.selectedTypeId.length > 0;
    const text = typeof body.text === "string" ? body.text.trim() : undefined;

    if (!hasText && !image && !hasSelectedType) {
      throw new BadRequestException("텍스트, 이미지, 직접 선택 유형 중 하나는 필요해요.");
    }

    if (text != null && text.length > MAX_TEXT_LENGTH) {
      throw new BadRequestException(`상황 설명은 ${MAX_TEXT_LENGTH}자 이내로 입력해 주세요.`);
    }

    const consentToExternalAI = body.consentToExternalAI === true || body.consentToExternalAI === "true";

    if (image && !consentToExternalAI) {
      throw new BadRequestException("이미지 분석에는 외부 AI 전송 동의가 필요해요.");
    }

    if (image && !this.isSupportedImageSignature(image)) {
      throw new BadRequestException("지원하지 않는 이미지 파일이에요.");
    }

    return this.analyzeService.analyze({
      request: {
        text,
        selectedTypeId: body.selectedTypeId,
        consentToExternalAI,
      },
      image,
    });
  }

  private isSupportedImageSignature(image: UploadedMemoryFile): boolean {
    const bytes = image.buffer;
    if (image.mimetype === "image/jpeg") {
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }
    if (image.mimetype === "image/png") {
      return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (image.mimetype === "image/gif") {
      const signature = bytes.subarray(0, 6).toString("ascii");
      return signature === "GIF87a" || signature === "GIF89a";
    }
    if (image.mimetype === "image/webp") {
      return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
    }
    return false;
  }

  private getClientIp(request: Request): string {
    const forwardedFor = request.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
      return forwardedFor.split(",")[0]!.trim();
    }
    return request.ip ?? "unknown";
  }
}
