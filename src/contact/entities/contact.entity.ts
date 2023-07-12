import { BaseEntity } from "src/core/base.entity";
import { Column, Entity, JoinColumn, ManyToOne, TableForeignKey } from "typeorm";

export enum ContactLinkPrecedence {
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
}

@Entity()
export class Contact extends BaseEntity {
    @Column()
    phoneNumber: string;

    @Column()
    email: string;

    @Column()
    linkPrecedence: string;

    @ManyToOne((type) => Contact, {
        cascade: true,
        nullable: true,
    })
    @JoinColumn({ name: 'linkedId' })
    linkedId: Contact;
}
