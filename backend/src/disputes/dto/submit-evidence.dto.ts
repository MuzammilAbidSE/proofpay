import { IsOptional, IsString } from "class-validator";

export class SubmitEvidenceDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  fileHash?: string;
}
