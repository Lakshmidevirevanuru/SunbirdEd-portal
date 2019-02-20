
import {combineLatest as observableCombineLatest,  Observable } from 'rxjs';
import { ServerResponse, PaginationService, ResourceService, ConfigService, ToasterService, INoResultMessage } from '@sunbird/shared';
import { SearchService, UserService, PermissionService } from '@sunbird/core';
import { Component, OnInit, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IPagination } from '@sunbird/announcement';
import * as _ from 'lodash';
import { Angular2Csv } from 'angular2-csv/Angular2-csv';
import { UserSearchService } from './../../services';
import { IInteractEventObject, IInteractEventEdata, IImpressionEventInput } from '@sunbird/telemetry';

@Component({
  selector: 'app-user-search',
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.scss']
})
export class UserSearchComponent implements OnInit {
  private searchService: SearchService;
  private resourceService: ResourceService;
  /**
	 * telemetryImpression
	*/
  telemetryImpression: IImpressionEventInput;
  closeIntractEdata: IInteractEventEdata;
  userViewIntractEdata: IInteractEventEdata;
  userDeleteIntractEdata: IInteractEventEdata;
  userEditIntractEdata: IInteractEventEdata;
  filterIntractEdata: IInteractEventEdata;
  /**
   * To get url, app configs
   */
  public config: ConfigService;
  /**
  * To show toaster(error, success etc) after any API calls
  */
  private toasterService: ToasterService;
  private userSearchService: UserSearchService;
  /**
   * Contains list of published course(s) of logged-in user
   */
  searchList: Array<any> = [];
  /**
   * To navigate to other pages
   */
  private route: Router;
  /**
  * To send activatedRoute.snapshot to router navigation
  * service for redirection to parent component
  */
  private activatedRoute: ActivatedRoute;
  /**
   * For showing pagination on inbox list
   */
  private paginationService: PaginationService;
  /**
 * To get user profile of logged-in user
 */
  public user: UserService;

  /**
    * To show / hide no result message when no result found
   */
  noResult = false;
  /**
   * no result  message
  */
  noResultMessage: INoResultMessage;
  /**
    * totalCount of the list
  */
  totalCount: Number;
  /**
   * Current page number of inbox list
   */
  pageNumber = 1;
  /**
	 * Contains page limit of outbox list
	 */
  pageLimit: number;
  /**
   * This variable hepls to show and hide page loader.
   * It is kept true by default as at first when we comes
   * to a page the loader should be displayed before showing
   * any data
   */
  showLoader = true;
  /**
     * loader message
    */
  loaderMessage: any;
  /**
   * Contains returned object of the pagination service
   * which is needed to show the pagination on inbox view
   */
  pager: IPagination;
  /**
   *url value
   */
  queryParams: any;

  rootOrgId: string;
  userProfile: any;
  inviewLogs: any = [];
  selectedRoles: Array<string>;

  customStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #fff',
    boxShadow: '0 0 6px 0 rgba(0,0,0,0.38)',
    borderRadius: '50%',
    color: '#024F9D',
    fontWeight: 'bold',
    fontFamily: 'inherit'
  };
  /**
     * Constructor to create injected service(s) object
     * Default method of Draft Component class
     * @param {SearchService} searchService Reference of SearchService
     * @param {Router} route Reference of Router
     * @param {PaginationService} paginationService Reference of PaginationService
     * @param {ActivatedRoute} activatedRoute Reference of ActivatedRoute
     * @param {ConfigService} config Reference of ConfigService
   */
  constructor(searchService: SearchService, route: Router, private ngZone: NgZone,
    activatedRoute: ActivatedRoute, paginationService: PaginationService,
    resourceService: ResourceService, toasterService: ToasterService,
    config: ConfigService, user: UserService, userSearchService: UserSearchService, public permissionService: PermissionService) {
    this.searchService = searchService;
    this.route = route;
    this.activatedRoute = activatedRoute;
    this.paginationService = paginationService;
    this.resourceService = resourceService;
    this.toasterService = toasterService;
    this.userSearchService = userSearchService;
    this.config = config;
    this.user = user;
  }
  /**
   * This method sets the make an api call to get all search data with page No and offset
   */
  populateUserSearch() {
    this.showLoader = true;
    this.pageLimit = this.config.appConfig.SEARCH.PAGE_LIMIT;
    const searchParams = {
      filters: {
        'rootOrgId': this.rootOrgId,
        'userType': this.queryParams.Usertype,
        'framework.medium': this.queryParams.medium,
        'framework.gradeLevel': this.queryParams.gradeLevel,
        'framework.subject': this.queryParams.subject,
        'organisations.roles': this.selectedRoles
      },
      limit: this.pageLimit,
      pageNumber: this.pageNumber,
      query: this.queryParams.key
    };
    if (this.queryParams.School) {
      searchParams.filters['organisations.organisationId'] = [this.queryParams.School];
    } else {
      const locationArray = [];
      if (this.queryParams.District) {
        locationArray.push(this.queryParams.District);
      }
      if (this.queryParams.Block) {
        locationArray.push(this.queryParams.Block);
      }
      if (!_.isEmpty(locationArray)) { searchParams.filters['locationIds'] = locationArray; }
    }
    this.searchService.userSearch(searchParams).subscribe(
      (apiResponse: ServerResponse) => {
        if (apiResponse.result.response.count && apiResponse.result.response.content.length > 0) {
          this.showLoader = false;
          this.noResult = false;
          this.searchList = apiResponse.result.response.content;
          this.totalCount = apiResponse.result.response.count;
          this.populateOrgNameAndSetRoles();
          this.pager = this.paginationService.getPager(apiResponse.result.response.count, this.pageNumber, this.pageLimit);
        } else {
          this.noResult = true;
          this.showLoader = false;
          this.noResultMessage = {
            'message': this.resourceService.messages.stmsg.m0008,
            'messageText': this.resourceService.messages.stmsg.m0007
          };
        }
      },
      err => {
        this.showLoader = false;
        this.noResult = true;
        this.noResultMessage = {
          'messageText': this.resourceService.messages.fmsg.m0077
        };
        this.toasterService.error(this.resourceService.messages.emsg.m0005);
      }
    );
  }

  populateOrgNameAndSetRoles() {
    // Getting Org Ids
    let orgArray = [];
    _.each(this.searchList, (key) => {
      _.each(key.organisations, (orgKey) => {
        orgArray.push(orgKey.organisationId);
      });
    });

    // Calling Org search API
    orgArray = _.uniq(orgArray);
    this.searchService.getOrganisationDetails({ orgid: orgArray }).subscribe(
      (orgApiResponse: any) => {
        _.each(this.searchList, (user) => {
          if (this.userProfile.rootOrgAdmin === true) {
            user.isEditableProfile = true;
          }
          _.each(user.organisations, (org) => {
            const orgNameAndId = _.find(orgApiResponse.result.response.content, (organisation) => {
              return organisation.id === org.organisationId;
            });
            // Setting Org Name
            if (orgNameAndId) { org.orgName = orgNameAndId.orgName; }
          });
        });
      }
    );
  }

  downloadUser() {
    const options = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true
    };

    const downloadArray = [{
      'firstName': 'First Name',
      'lastName': 'Last Name',
      'organisations': 'Organizations',
      'location': 'Location',
      'grades': 'Grades',
      'language': 'Language',
      'subject': 'Subject'
    }];

    _.each(this.searchList, (key, index) => {
      downloadArray.push({
        'firstName': key.firstName,
        'lastName': key.lastName,
        'organisations': 'test',
        'location': key.location !== null ? key.location : '',
        'grades': _.join(key.grade, ','),
        'language': _.join(key.language, ','),
        'subject': _.join(key.subject, ',')
      });
    });

    return new Angular2Csv(downloadArray, 'Users', options);
  }


  /**
  * This method helps to navigate to different pages.
  * If page number is less than 1 or page number is greater than total number
  * of pages is less which is not possible, then it returns.
  *
  * @param {number} page Variable to know which page has been clicked
  *
  * @example navigateToPage(1)
  */
  navigateToPage(page: number): undefined | void {
    if (page < 1 || page > this.pager.totalPages) {
      return;
    }
    this.pageNumber = page;
    this.route.navigate(['search/Users', this.pageNumber], {
      queryParams: this.queryParams
    });
  }

  ngOnInit() {
    this.user.userData$.subscribe(userdata => {
      if (userdata && !userdata.err) {
        this.userProfile = userdata.userProfile;
        this.rootOrgId = this.userProfile.rootOrgId;
        observableCombineLatest(this.activatedRoute.params, this.activatedRoute.queryParams,
          (params: any, queryParams: any) => {
            return {
              params: params,
              queryParams: queryParams
            };
          })
          .subscribe(bothParams => {
            if (bothParams.params.pageNumber) {
              this.pageNumber = Number(bothParams.params.pageNumber);
            }
            this.queryParams = { ...bothParams.queryParams };
            if (this.queryParams.Roles) {
              this.permissionService.permissionAvailable$.subscribe(params => {
                if (params === 'success') {
                  this.selectedRoles = [];
                  _.forEach(this.permissionService.allRoles, (role) => {
                    if (this.queryParams.Roles.includes(role.roleName)) { this.selectedRoles.push(role.role); }
                  });
                  this.populateUserSearch();
                }
              });
            } else {
              this.populateUserSearch();
            }
          });
      }
    });
    this.setInteractEventData();
    this.telemetryImpression = {
      context: {
        env: this.activatedRoute.snapshot.data.telemetry.env
      },
      edata: {
        type: this.activatedRoute.snapshot.data.telemetry.type,
        pageid: this.activatedRoute.snapshot.data.telemetry.pageid,
        uri: this.route.url,
        subtype: this.activatedRoute.snapshot.data.telemetry.subtype
      }
    };

    this.userSearchService.userDeleteEvent.subscribe(data => {
      _.each(this.searchList, (key, index) => {
        if (data && data === key.id) {
          this.searchList[index].status = 0;
        }
      });
    });
  }
  setInteractEventData() {
    this.closeIntractEdata = {
      id: 'user-search-close',
      type: 'click',
      pageid: 'user-search'
    };
    this.userViewIntractEdata = {
      id: 'user-profile-view',
      type: 'click',
      pageid: 'user-search'
    };
    this.userEditIntractEdata = {
      id: 'user-profile-edit',
      type: 'click',
      pageid: 'user-search'
    };
    this.userDeleteIntractEdata = {
      id: 'user-profile-delete',
      type: 'click',
      pageid: 'user-search'
    };
    this.filterIntractEdata = {
      id: 'filter',
      type: 'click',
      pageid: 'user-search'
    };
  }
  inview(event) {
    _.forEach(event.inview, (inview, key) => {
      const obj = _.find(this.inviewLogs, (o) => {
        return o.objid === inview.data.identifier;
      });
      if (obj === undefined) {
        this.inviewLogs.push({
          objid: inview.data.identifier,
          objtype: 'user',
          index: inview.id
        });
      }
    });
    this.telemetryImpression.edata.visits = this.inviewLogs;
    this.telemetryImpression.edata.subtype = 'pageexit';
    this.telemetryImpression = Object.assign({}, this.telemetryImpression);
  }
}
