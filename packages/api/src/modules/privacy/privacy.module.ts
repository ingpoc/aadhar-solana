import { Module } from '@nestjs/common';
import { PrivacyNoticeService } from './privacy-notice.service';
import { BreachNotificationService } from './breach-notification.service';

@Module({
  providers: [PrivacyNoticeService, BreachNotificationService],
  exports: [PrivacyNoticeService, BreachNotificationService],
})
export class PrivacyModule {}
