import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GiftListComponent } from './gift-list.component';
import { GiftService } from '../services/gift.service';
import { GiftAiService } from '../services/gift-ai.service';
import { AuthService } from '../services/auth.service';

describe('GiftListComponent', () => {
  let component: GiftListComponent;
  let fixture: ComponentFixture<GiftListComponent>;
  let giftService: jasmine.SpyObj<GiftService>;

  beforeEach(async () => {
    giftService = jasmine.createSpyObj<GiftService>('GiftService', [
      'getGifts',
      'addGift',
      'updateGift',
      'deleteGift',
      'reorderGifts',
      'exportGifts',
      'downloadGiftsAsJson'
    ]);
    giftService.getGifts.and.returnValue(of([]));
    giftService.reorderGifts.and.returnValue(of({ message: 'ok' }));

    const giftAiService = jasmine.createSpyObj<GiftAiService>('GiftAiService', [
      'generateGiftSuggestions',
      'suggestCategoriesToExplore',
      'generateCategorySpecificSuggestions',
      'importExistingGiftList',
      'findProductLinks',
      'findCheaperAlternatives'
    ]);

    await TestBed.configureTestingModule({
      imports: [GiftListComponent],
      providers: [
        { provide: GiftService, useValue: giftService },
        { provide: GiftAiService, useValue: giftAiService },
        { provide: AuthService, useValue: { isAuthenticated$: of(false) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GiftListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with one editable price option', () => {
    expect(component).toBeTruthy();
    expect(component.pricePointsArray.length).toBe(1);
  });

  it('should normalize safe product links and reject unsafe protocols', () => {
    expect(component.safeGiftUrl('example.com/gift')).toBe('https://example.com/gift');
    expect(component.safeGiftUrl('javascript:alert(1)')).toBeNull();
  });

  it('should filter gifts by text and budget', () => {
    component.gifts = [
      {
        id: 'one',
        name: 'Livre photo',
        description: 'Souvenirs de voyage',
        pricePoints: [{ label: 'Relié', price: 42, link: 'https://example.com' }]
      },
      {
        id: 'two',
        name: 'Casque audio',
        description: 'Musique',
        pricePoints: [{ label: 'Premium', price: 180, link: 'https://example.com' }]
      }
    ];

    component.searchQuery = 'voyage';
    expect(component.filteredGifts.map(gift => gift.id)).toEqual(['one']);

    component.searchQuery = '';
    component.setBudgetFilter('over-100');
    expect(component.filteredGifts.map(gift => gift.id)).toEqual(['two']);
  });

  it('should persist a reordered list in one request', () => {
    component.gifts = [
      { id: 'one', name: 'Premier', priority: 0, pricePoints: [] },
      { id: 'two', name: 'Second', priority: 1, pricePoints: [] }
    ];

    component.moveGiftPosition(1, 'up');

    expect(component.gifts.map(gift => gift.id)).toEqual(['two', 'one']);
    expect(giftService.reorderGifts).toHaveBeenCalledOnceWith([
      { id: 'two', priority: 0 },
      { id: 'one', priority: 1 }
    ]);
  });
});
