import { Injectable, Logger } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Contact, ContactLinkPrecedence } from './entities/contact.entity';
import { In, Repository } from 'typeorm';

/**
 * Add docker file
 * host to heroku
 */

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  async identifyContacts(createContactDto: CreateContactDto) {
    // finding the primary contact
    const identityContact = await this.findSingleContact(
      createContactDto.email,
      createContactDto.phoneNumber,
    );
    const primaryContact =
      identityContact?.linkPrecedence === ContactLinkPrecedence.PRIMARY
        ? identityContact
        : identityContact?.linkedContact;

    this.logger.debug(`Primary Contact from db: ${primaryContact?.id}`);

    // if there is no primary contact creating a new one and returning the data
    if (!primaryContact) {
      this.logger.debug(`No primary contact found. creating a new contact`);
      const newContact = await this.create(createContactDto);
      return await this.contactResponse([newContact]);
    }

    // Handling the creation of secondary contact
    this.logger.debug(`Started creation of secondary contact if required`);
    await this.handleCreationOfSecondayContact(
      createContactDto,
      primaryContact,
    );

    // checking for multiple primary contacts. If present then update other than older to secondary
    this.logger.debug(
      `Started Handling the multiple primary contacts scenario`,
    );
    await this.handleMultiplePrimaryContacts(createContactDto);

    // Fetching all the secondary contacts
    this.logger.debug(`Fetching all the secondary contacts`);
    const secondaryContacts = await this.findContacts({
      linkedContact: { id: primaryContact.id },
    });

    return await this.contactResponse([primaryContact, ...secondaryContacts]);
  }

  async handleMultiplePrimaryContacts(createContactDto: CreateContactDto) {
    const primaryContacts = await this.findContacts([
      {
        email: createContactDto.email ? createContactDto.email : '',
        linkPrecedence: ContactLinkPrecedence.PRIMARY,
      },
      {
        phoneNumber: createContactDto.phoneNumber
          ? createContactDto.phoneNumber
          : '',
        linkPrecedence: ContactLinkPrecedence.PRIMARY,
      },
    ]);
    if (primaryContacts.length > 1) {
      const contactIds = [];
      for (const contact of primaryContacts.slice(1)) {
        contactIds.push(contact.id);
      }
      await this.bulkUpdate(contactIds, {
        linkPrecedence: ContactLinkPrecedence.SECONDARY,
        linkedContact: primaryContacts[0],
      });
    }
  }

  async handleCreationOfSecondayContact(
    createContactDto: CreateContactDto,
    primaryContact: Contact,
  ) {
    // checking to create a secondary contact or not
    const canCreateSecondaryContact = await this.canCreateSecondaryContact(
      createContactDto.email,
      createContactDto.phoneNumber,
    );

    // if above check passed creating a secondary contact
    if (canCreateSecondaryContact) {
      createContactDto.linkPrecedence = ContactLinkPrecedence.SECONDARY;
      createContactDto.linkedContact = primaryContact;
      await this.create(createContactDto);
    }
  }

  async contactResponse(contacts: Contact[]) {
    const uniqueEmails = Array.from(
      new Set(contacts.map((contact) => contact.email)),
    ).filter(Boolean);
    const uniquePhoneNumbers = Array.from(
      new Set(contacts.map((contact) => contact.phoneNumber)),
    ).filter(Boolean);
    return contacts.length > 0
      ? {
          contact: {
            primaryContactId: contacts[0].id,
            emails: uniqueEmails,
            phoneNumbers: uniquePhoneNumbers,
            secondaryContactIds:
              contacts.length > 0
                ? Array.from(
                    new Set(contacts.slice(1).map((contact) => contact.id)),
                  )
                : [],
          },
        }
      : [];
  }

  async canCreateSecondaryContact(email: string, phoneNumber: string) {
    const emailContact = await this.contactRepository.findOneBy({
      email: email,
    });
    const phoneNumberContact = await this.contactRepository.findOneBy({
      phoneNumber: phoneNumber,
    });
    return !emailContact || !phoneNumberContact ? true : false;
  }

  async findContacts(query: any) {
    return await this.contactRepository.find({
      where: query,
      order: { id: 'ASC' },
    });
  }

  async findSingleContact(email: string, phoneNumber: string) {
    return await this.contactRepository.findOne({
      where: [{ email: email }, { phoneNumber: phoneNumber }],
      relations: { linkedContact: true },
    });
  }

  async create(createContactDto: CreateContactDto) {
    return await this.contactRepository.save(createContactDto);
  }

  async bulkUpdate(ids: number[], updateContactDto: UpdateContactDto) {
    return await this.contactRepository
      .createQueryBuilder()
      .update(Contact)
      .set({
        linkPrecedence: updateContactDto.linkPrecedence,
        linkedContact: updateContactDto.linkedContact,
      })
      .where({ id: In(ids) })
      .execute();
  }
}
