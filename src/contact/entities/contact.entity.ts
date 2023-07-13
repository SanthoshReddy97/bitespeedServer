import { BaseEntity } from 'src/core/base.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  TableForeignKey,
} from 'typeorm';

export enum ContactLinkPrecedence {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

@Entity()
export class Contact extends BaseEntity {
  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: ContactLinkPrecedence.PRIMARY })
  linkPrecedence: string;

  @ManyToOne((type) => Contact, {
    cascade: true,
    nullable: true,
  })
  @JoinColumn({ name: 'linkedId' })
  linkedContact: Contact;
}
