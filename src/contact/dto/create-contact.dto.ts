import { ApiProperty } from '@nestjs/swagger';
import { Contact } from '../entities/contact.entity';

export class CreateContactDto {
  @ApiProperty({ required: true })
  email: string;

  @ApiProperty({ required: true })
  phoneNumber: string;

  linkPrecedence: string;

  linkedContact: Contact;
}
