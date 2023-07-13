import { ApiProperty } from '@nestjs/swagger';
import { Contact } from '../entities/contact.entity';

export class CreateContactDto {
  @ApiProperty({ required: false })
  email: string;

  @ApiProperty({ required: false })
  phoneNumber: string;

  linkPrecedence: string;

  linkedContact: Contact;
}
