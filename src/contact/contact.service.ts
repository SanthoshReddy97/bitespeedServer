import { Injectable, Logger } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Contact, ContactLinkPrecedence } from './entities/contact.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  async identifyContacts(createContactDto: CreateContactDto) {
    // get if contacts are present with email or phoneNumber in oldest created first
    const identityContact = await this.findSingleContact(
      createContactDto.email,
      createContactDto.phoneNumber,
    );
    const primaryContact =
      identityContact?.linkPrecedence === ContactLinkPrecedence.PRIMARY
        ? identityContact
        : identityContact?.linkedContact;

    // if no existing records create a new record and return response
    if (!primaryContact) {
      const newContact = await this.create(createContactDto);
      return await this.contactResponse([newContact]);
    }

    // check if a contact is present with the exact email or phone
    // const newSecondaryContact = await this.findSingleContact(
    //   createContactDto.email,
    //   createContactDto.phoneNumber,
    // );
    const canCreateSecondaryContact = await this.canCreateSecondaryContact(
      createContactDto.email,
      createContactDto.phoneNumber,
    );

    // if contacts are present and freshContact is null then we need to create a secondary contact
    if (canCreateSecondaryContact) {
      createContactDto.linkPrecedence = ContactLinkPrecedence.SECONDARY;
      createContactDto.linkedContact = primaryContact;
      await this.create(createContactDto);
    }

    // if records are present create a new secondary record considering the oldest as primary
    const primaryContacts = await this.findPrimaryContacts(
      createContactDto.email,
      createContactDto.phoneNumber,
    );
    if (primaryContacts.length > 1) {
      const contactIds = [];
      for (const contact of primaryContacts.slice(1)) {
        if (contact.linkPrecedence === ContactLinkPrecedence.PRIMARY) {
          contactIds.push(contact.id);
        }
      }
      await this.bulkUpdate(contactIds, {
        linkPrecedence: ContactLinkPrecedence.SECONDARY,
        linkedContact: primaryContacts[0],
      });
    }

    const secondaryContacts = await this.findSecondaryContacts(
      primaryContact.id,
    );

    return await this.contactResponse([primaryContact, ...secondaryContacts]);
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

  async findPrimaryContacts(email: string, phoneNumber: string) {
    return await this.contactRepository.find({
      where: [
        { email: email },
        {
          phoneNumber: phoneNumber,
        },
      ],
      order: { createdAt: 'ASC' },
    });
  }

  async findSecondaryContacts(primaryContactId: number) {
    return await this.contactRepository.find({
      where: {
        linkedContact: { id: primaryContactId },
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findSingleContact(email: string, phoneNumber: string) {
    return await this.contactRepository.findOne({
      where: [{ email: email }, { phoneNumber: phoneNumber }],
      relations: { linkedContact: true },
    });
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
