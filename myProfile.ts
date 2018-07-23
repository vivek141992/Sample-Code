import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';

import { environment } from '../../../environments/environment';
import { AppState } from '../app.service';
import { LoggerService } from '../services/common/logger.service';
import { HelpersService } from '../services/helpers.service';
import { DialogService } from '../services/dialog.service';
import { DeactivateComponent } from './deactivate/deactivate';
import { EditProfileComponent } from './edit-profile/edit-profile';
import { AccountService, ProfileInterface, PushNotificationsInterface } from '../services/account.service';
import { ChangeUsernameComponent } from './change-username/change-username';
import { ChangePasswordComponent } from './change-password/change-password';
import { ChangeDistrictComponent } from './change-district/change-district';
import { EmailVerificationDialogComponent } from '../dialogs/email-verification/email-verification-dialog';
import { ConnectCafeteriaAccountComponent } from '../dialogs/connect-cafeteria-account/connect-cafeteria-account';
import { StudentService } from '../services/student.service';

@Component({
    styleUrls: ['./my-profile.component.scss'],
    templateUrl: './my-profile.component.html'
})

export class MyProfileComponent implements OnInit {

    public environment = environment;
    public loading: boolean;
    public userProfile = {} as ProfileInterface;
    public studentConnected: boolean;
    public isCafeteriaAccountConnectionAllowed: boolean;
    public connected: boolean;
    public showAccountCnt: boolean;
    public studentList;
    public isStudent: boolean;
    public isSuperAdmin: boolean;
    public enablePushNotifications: boolean;
    public isNotificationsLoading: boolean;
    public isNotificationsDisabled: boolean = true;
    public pushNotificationSettings: PushNotificationsInterface = {
        SendLowBalanceAlerts: false,
        SendMessageAlerts: false,
        SendAutoPayAlerts: false,
        SendFavoriteAlerts: false
    };

    constructor(public appState: AppState,
                public dialog: MatDialog,
                public logger: LoggerService,
                public helpersService: HelpersService,
                public accountService: AccountService,
                public dialogService: DialogService,
                public studentService: StudentService) {
    }

    public ngOnInit() {
        this.isStudent = this.appState.get('accessLevel') === '5' && !this.helpersService.isPermittedTo('MKPMT');
        this.isSuperAdmin = this.appState.get('accessLevel') === '4';

        this.getUserProfile();
        this.cafeteriaAccountConnectionAllowed();
        this.isStudentConnected();

        if (!this.environment.web) {
            this.getPushNotificationSettings();
        }
    }

    /**
     * Get Profile Details
     */
    public getUserProfile() {
        this.loading = true;
        this.accountService.getProfileDetails()
            .subscribe(
                (data) => {
                    if (data) {
                        /** Remove empty spaces */
                        data.ZipCode = data.ZipCode ? data.ZipCode.toString().trim() : '';
                        data.Phone = data.Phone ? data.Phone.trim() : '';
                        /** Format phone number */
                        if (data.Phone) {
                            data.Phone = this.helpersService.formatPhoneNumber(data.Phone);
                        }
                        /** Replace Security Answer with stars */
                        data.EncryptedAnswer = data.ReminderAnswer ? data.ReminderAnswer.replace(/./g, '*') : '';
                        this.userProfile = data;
                        /** Update email in app state */
                        this.appState.set('email', data.Email);
                    }
                    this.loading = false;
                }, (error) => {
                    this.logger.log(error);
                    this.loading = false;
                }
            );
    }

    /**
     * Email verification dialog
     */
    public verifyEmail() {
        this.dialog.open(EmailVerificationDialogComponent);
    }

    /**
     * Check if email is verified
     */
    public checkEmailVerificationStatus() {
        this.accountService.verifyEmail().subscribe(
            (verified) => {
                this.appState.set('verified', verified);
            },
            (error) => {
                this.logger.log(error);
            }
        );
    }

    /**
     * Edit user profile
     */
    public editProfile() {
        const dialogRef = this.dialog.open(EditProfileComponent, {
            data: { userProfile: this.userProfile },
            disableClose: true
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.helpersService.showMessage(result);
                this.getUserProfile();
                this.checkEmailVerificationStatus();
            }
        });
    }

    /**
     * Deactivate user account
     */
    public deactivateAccount() {
        /**
         * Ask Confirmation
         */
        this.dialogService.alert(
            'MY_PROFILE.DEACTIVATE.CONFIRM_MESSAGE',
            undefined,
            'MY_PROFILE.DEACTIVATE.CONFIRM_YES',
            'MY_PROFILE.DEACTIVATE.CONFIRM_NO',
            'warn')
            .then((data) => {
                if (data) {
                    /**
                     * Open deactivate dialog
                     */
                    const dialogRef = this.dialog.open(DeactivateComponent);
                    dialogRef.afterClosed().subscribe((result) => {
                        if (result) {
                            this.helpersService.showMessage(result);
                        }
                    });
                }
            });
    }

    /**
     * Edit username
     */
    public changeUsername() {
        const dialogRef = this.dialog.open(ChangeUsernameComponent, {
            data: { userProfile: this.userProfile }
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.helpersService.showMessage(result);
                this.getUserProfile();
            }
        });
    }

    /**
     * Edit user password
     */
    public changePassword() {
        const dialogRef = this.dialog.open(ChangePasswordComponent, {
            data: { userProfile: this.userProfile }
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.helpersService.showMessage(result);
            }
        });
    }

    /**
     * Edit user district
     */
    public changeDistrict() {
        /**
         * Ask Confirmation
         */
        this.dialogService.alert(
            'COMMON.WARNING',
            'MY_PROFILE.CHANGE_DISTRICT.CONFIRM_MESSAGE',
            'MY_PROFILE.CHANGE_DISTRICT.CONFIRM_YES',
            'MY_PROFILE.CHANGE_DISTRICT.CONFIRM_NO',
            'warn')
            .then((data) => {
                if (data) {
                    /**
                     * Open change district dialog
                     */
                    this.dialog.open(ChangeDistrictComponent);
                }
            });
    }

    public addStudent() {
        const dialogRef = this.dialog.open(ConnectCafeteriaAccountComponent);
        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.cafeteriaAccountConnectionAllowed();
                this.isStudentConnected();
            }
        });
    }

    /**
     * Student connected or not
     */
    public isStudentConnected() {
        this.loading = true;
        this.studentService.getStudentDetails()
            .subscribe(
                (data) => {
                    if (data['Name'] != null) {
                        this.studentConnected = true;
                    }
                    this.loading = false;
                }, (error) => {
                    this.logger.log(error);
                    this.loading = false;
                }
            );
    }

    /**
     * Student connected or not for cafeteria account
     */
    public cafeteriaAccountConnectionAllowed() {
        this.studentService.getStudentRecords(0).subscribe
        (
            data => {
                this.studentList = data;
                this.connected = !!(this.studentList && this.studentList.length === 0);
                this.studentService.cafeteriaAccountConnectionAllowed().subscribe(
                    cafeteriaConnected => {
                        this.isCafeteriaAccountConnectionAllowed = (cafeteriaConnected === true);
                        if (this.isCafeteriaAccountConnectionAllowed) {
                            if (!this.connected && this.appState.get('accessLevel') === '5') {
                                this.showAccountCnt = true;
                                this.studentConnected = false;
                            }
                            if (this.connected && this.appState.get('accessLevel') === '5') {
                                this.showAccountCnt = true;
                                this.studentConnected = true;
                            }
                        } else {
                            if (!this.connected && this.appState.get('accessLevel') === '5') {
                                this.showAccountCnt = true;
                                this.studentConnected = false;
                            }
                            if (this.connected && this.appState.get('accessLevel') === '5') {
                                this.showAccountCnt = false;
                                this.studentConnected = false;
                            }
                        }
                    },
                    error => {
                        this.logger.log(error);
                    });
            },
            error => {
                this.logger.log(error);
            });

    }

    /**
     * Disconnect Student cafeteria account
     */
    public disconnectStudentAccount() {
        /**
         * Ask Confirmation to disconnect cafeteria
         */
        this.dialogService.alert(
            'MY_PROFILE.DISCONNECT.CONFIRM_MESSAGE',
            undefined,
            'MY_PROFILE.DISCONNECT.CONFIRM_YES',
            'MY_PROFILE.DISCONNECT.CONFIRM_NO',
            'warn').then((data) => {
            if (data) {
                this.loading = true;
                this.studentService.deleteUserPerson().subscribe(
                    deletePerson => {
                        this.logger.log(deletePerson);
                        this.studentService.cafeteriaAccountConnectionAllowed().subscribe(
                            cafeteriaConnected => {
                                this.isCafeteriaAccountConnectionAllowed = (cafeteriaConnected !== false);
                                this.connected = false;
                                if (this.isCafeteriaAccountConnectionAllowed) {
                                    this.studentConnected = false;
                                }
                                if (this.appState.get('accessLevel') === '5' && !this.connected
                                    && !this.isCafeteriaAccountConnectionAllowed) {
                                    this.logger.log(this.connected);
                                    this.logger.log(this.isCafeteriaAccountConnectionAllowed);
                                    this.showAccountCnt = false;
                                }
                                this.cafeteriaAccountConnectionAllowed();
                                this.loading = false;
                                this.helpersService.showMessage('MY_PROFILE.DISCONNECT.DISCONNECT_MESSAGE');
                            },
                            error => {
                                this.logger.log(error);
                                this.loading = false;
                            });
                    },
                    error => {
                        this.logger.log(error);
                        this.loading = false;
                    });
            }
        });
    }

    /**
     * Get Push Notification Settings
     */
    public getPushNotificationSettings() {
        this.isNotificationsLoading = true;
        this.isNotificationsDisabled = true;
        this.accountService.getPushAlerts().subscribe(
            (data) => {
                this.pushNotificationSettings = data || {} as PushNotificationsInterface;

                // Enable push notifications if any one is true
                this.enablePushNotifications =
                    this.pushNotificationSettings.SendLowBalanceAlerts
                    || this.pushNotificationSettings.SendMessageAlerts
                    || this.pushNotificationSettings.SendAutoPayAlerts
                    || this.pushNotificationSettings.SendFavoriteAlerts;

                this.isNotificationsLoading = false;
                this.isNotificationsDisabled = false;
            },
            (error) => {
                this.logger.log(error);
                this.isNotificationsLoading = false;
                this.isNotificationsDisabled = true;
            }
        );
    }

    /**
     * Update push notification setting
     */
    public updatePushNotificationSettings(ev?, val?: string) {
        if (ev && val) {
            this.pushNotificationSettings[val] = ev.checked;
        }
        this.accountService.postPushAlerts(this.pushNotificationSettings).subscribe(
            (data) => {
                this.logger.log(data);
            },
            (error) => {
                this.logger.log(error);
            }
        );
        this.enablePushNotifications =
            this.pushNotificationSettings.SendLowBalanceAlerts
            || this.pushNotificationSettings.SendMessageAlerts
            || this.pushNotificationSettings.SendAutoPayAlerts
            || this.pushNotificationSettings.SendFavoriteAlerts;
    }

    /**
     * Update all push notification settings
     */
    public togglePushNotifications(ev) {
        if (!ev) {
            return;
        }
        this.enablePushNotifications = ev.checked;
        for (const setting in this.pushNotificationSettings) {
            if (this.pushNotificationSettings.hasOwnProperty(setting)) {
                this.pushNotificationSettings[setting] = ev.checked;
            }
        }
        this.updatePushNotificationSettings();
    }

}
