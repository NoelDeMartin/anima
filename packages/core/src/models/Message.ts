import type { BelongsToManyRelation } from 'soukai-bis';

import Model from './Message.schema';
import type MessagePart from './MessagePart';

export default class Message extends Model {
  declare public relatedParts: BelongsToManyRelation<this, MessagePart, typeof MessagePart>;
}
