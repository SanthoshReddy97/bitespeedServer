import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Identity APIs')
@Controller('identity')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async create(@Body() createContactDto: CreateContactDto) {
    try {
      if (!createContactDto.email && !createContactDto.phoneNumber) {
        throw new HttpException('At least one field (email or phoneNumber) is required', HttpStatus.BAD_REQUEST)
      }
      return await this.contactService.identifyContacts(createContactDto);
    } catch (error) {
      Logger.error(`Unhandled Internal server error: ${error?.message}`);
      throw new HttpException(
        { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: error?.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
