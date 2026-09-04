import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Camera,
  ChevronDown,
  Clock,
  Cloud,
  Droplet,
  Heart,
  Lightbulb,
  Sparkles,
  Stethoscope,
  Sun,
  Trash2,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { Colors, Metrics } from '@/theme';
import { Card, IconBadge } from '@/components';
import { CREDIT_COSTS } from '@/services';

type NeedItem = {
  icon: LucideIcon;
  label: string;
};

const PLANT_NEEDS: NeedItem[] = [
  { icon: Sun, label: 'Luz indireta forte' },
  { icon: Droplet, label: 'Água quando a terra secar' },
  { icon: Clock, label: 'Tempo pra se adaptar' },
];

const COMMON_MISTAKES: string[] = [
  'Regar todo dia "só pra garantir" — isso afoga a raiz mais rápido do que parece.',
  'Ignorar sinais de praga no começo: quanto antes perceber, mais fácil resolver.',
  'Adubar uma planta doente achando que vai "dar força" — geralmente piora a situação.',
];

const CURIOSITIES: string[] = [
  'Durante o dia, as plantas absorvem gás carbônico e liberam oxigênio — respiram meio ao contrário da gente.',
  'Fototropismo é o nome do fenômeno que faz o caule e as folhas se virarem em direção à luz.',
  'Algumas espécies fecham as folhas à noite e abrem de novo de manhã, como se estivessem dormindo.',
  'Debaixo da terra, raízes de plantas diferentes podem trocar nutrientes através de redes de fungos.',
];

const CURIOSITY_COLORS = [Colors.leaf, Colors.primary, Colors.secondary, Colors.accent];

type BenefitItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const PLANT_BENEFITS: BenefitItem[] = [
  { icon: Heart, title: 'Menos estresse', description: 'Cuidar de plantas ajuda a relaxar e desacelerar.' },
  { icon: Cloud, title: 'Ar mais úmido', description: 'Elas ajudam a umidificar e filtrar o ambiente.' },
  { icon: Sparkles, title: 'Uma rotina boa', description: 'Regar, observar, perceber mudanças traz calma.' },
  { icon: TrendingUp, title: 'Ver ela crescer', description: 'Cada folha nova é resultado do seu cuidado.' },
];

type FaqItem = {
  id: string;
  icon: LucideIcon;
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'diagnose',
    icon: Stethoscope,
    question: 'Como funciona o diagnóstico por IA?',
    answer: `Toque em "Diagnosticar minha planta" aqui na Ajuda (ou vá direto na aba Foto e escolha "Diagnosticar"), tire uma foto e a IA analisa o que aparece nela: se a planta está saudável, o que pode estar errado e o que fazer a seguir. Custa ${CREDIT_COSTS.diagnosis} créditos por diagnóstico, e fica salvo no seu histórico.`,
  },
  {
    id: 'identify',
    icon: Camera,
    question: 'Como funciona a identificação por foto?',
    answer:
      'Na aba Foto, com o modo "Identificar" selecionado, tire uma foto (ou escolha uma da galeria) de perto de uma folha ou flor. A gente manda a imagem pro Pl@ntNet, que reconhece a espécie e já sugere um perfil de cuidados pra você revisar antes de salvar.',
  },
  {
    id: 'care',
    icon: Droplet,
    question: 'De onde vêm os valores de luz, temperatura e umidade?',
    answer:
      'Depois da identificação, perguntamos pra uma IA sobre a espécie (rega, luz, temperatura, toxicidade e curiosidades) e preenchemos os campos automaticamente. Você pode ajustar qualquer valor antes de salvar — são esses números que vão orientar os cuidados da planta.',
  },
  {
    id: 'sun',
    icon: Sun,
    question: 'O que significam os sóis?',
    answer:
      'É uma forma mais intuitiva de mostrar a quantidade de luz ideal, em 5 níveis: de 1 sol (sombra) até 5 sóis (sol pleno). Quanto mais sóis, mais luz direta a planta precisa.',
  },
  {
    id: 'watering',
    icon: Bell,
    question: 'Como funcionam os lembretes de rega?',
    answer:
      'Ao cadastrar a planta você define de quantos em quantos dias ela precisa de água. A gente cria a tarefa de rega automaticamente e ela volta a aparecer em "Para hoje" sempre que o ciclo se repete.',
  },
  {
    id: 'delete',
    icon: Trash2,
    question: 'Como eu excluo uma planta?',
    answer:
      'Abra a planta e toque no ícone de lixeira no topo da tela. Isso apaga a planta e todas as tarefas de cuidado associadas a ela — essa ação não pode ser desfeita.',
  },
  {
    id: 'sync',
    icon: Cloud,
    question: 'Minhas plantas ficam salvas na nuvem?',
    answer:
      'Sim! Tudo fica salvo na sua conta, então você pode trocar de aparelho sem perder seu jardim.',
  },
];

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Metrics.spacing.lg }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Ajuda</Text>
        <Text style={styles.subtitle}>Diagnóstico, dicas pra começar e perguntas frequentes</Text>
      </View>

      <Pressable
        style={styles.diagnosisCard}
        onPress={() => router.push({ pathname: '/(tabs)/photo', params: { mode: 'diagnose' } })}
      >
        <IconBadge size={52} backgroundColor={Colors.leafForeground}>
          <Stethoscope size={Metrics.icon.large} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
        </IconBadge>
        <View style={styles.diagnosisTextBox}>
          <Text style={styles.diagnosisTitle}>Diagnosticar minha planta</Text>
          <Text style={styles.diagnosisSubtitle}>Tire uma foto e receba um diagnóstico com IA na hora</Text>
        </View>
        <ArrowRight size={Metrics.icon.normal} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
      </Pressable>

      <Pressable style={styles.historyLink} onPress={() => router.push('/diagnose')}>
        <Text style={styles.historyLinkText}>Ver diagnósticos anteriores</Text>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>Primeiros passos</Text>
      </View>

      <View style={styles.needsCard}>
        <Text style={styles.needsTitle}>O que toda planta precisa</Text>
        <View style={styles.needsRow}>
          {PLANT_NEEDS.map((need) => {
            const Icon = need.icon;
            return (
              <View key={need.label} style={styles.needChip}>
                <Icon size={18} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
                <Text style={styles.needChipText}>{need.label}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.needsCaption}>
          E um vaso com furo de drenagem — sem isso, a água acumulada apodrece a raiz.
        </Text>
      </View>

      <View style={styles.mistakesCard}>
        <View style={styles.mistakesHeader}>
          <AlertTriangle size={18} color={Colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
          <Text style={styles.mistakesTitle}>Erros comuns de quem tá começando</Text>
        </View>
        {COMMON_MISTAKES.map((mistake) => (
          <View key={mistake} style={styles.mistakeRow}>
            <X size={14} color={Colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
            <Text style={styles.mistakeText}>{mistake}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.subsectionTitle}>Curiosidades sobre plantas</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.curiosityRow}
        style={styles.curiosityScroll}
      >
        {CURIOSITIES.map((fact, index) => {
          const color = CURIOSITY_COLORS[index % CURIOSITY_COLORS.length];
          return (
            <View key={fact} style={[styles.curiosityCard, { backgroundColor: `${color}1A`, borderColor: color }]}>
              <Lightbulb size={20} color={color} strokeWidth={Metrics.icon.strokeWidth} />
              <Text style={styles.curiosityText}>{fact}</Text>
            </View>
          );
        })}
      </ScrollView>

      <Text style={styles.subsectionTitle}>Por que ter plantas em casa</Text>
      <View style={styles.benefitsGrid}>
        {PLANT_BENEFITS.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <View key={benefit.title} style={styles.benefitTile}>
              <IconBadge size={36} backgroundColor={`${Colors.accent}22`}>
                <Icon size={18} color={Colors.accent} strokeWidth={Metrics.icon.strokeWidth} />
              </IconBadge>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitText}>{benefit.description}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>Perguntas frequentes</Text>
      </View>

      {FAQ_ITEMS.map((item) => {
        const isOpen = openId === item.id;
        const Icon = item.icon;

        return (
          <Card key={item.id} style={styles.card} onPress={() => setOpenId(isOpen ? null : item.id)}>
            <View style={styles.row}>
              <IconBadge>
                <Icon size={Metrics.icon.normal} color={Colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
              </IconBadge>
              <Text style={styles.question}>{item.question}</Text>
              <ChevronDown
                size={Metrics.icon.normal}
                color={Colors.mutedForeground}
                strokeWidth={Metrics.icon.strokeWidth}
                style={isOpen ? styles.chevronOpen : undefined}
              />
            </View>

            {isOpen ? <Text style={styles.answer}>{item.answer}</Text> : null}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Metrics.spacing.lg,
  },
  header: {
    marginBottom: Metrics.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginTop: Metrics.spacing.xs,
  },
  diagnosisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.md,
    backgroundColor: Colors.leaf,
    borderRadius: Metrics.radius.lg,
    padding: Metrics.spacing.md,
    marginBottom: Metrics.spacing.xl,
  },
  diagnosisTextBox: {
    flex: 1,
  },
  diagnosisTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.leafForeground,
  },
  diagnosisSubtitle: {
    fontSize: 13,
    color: Colors.leafForeground,
    opacity: 0.85,
    marginTop: 2,
  },
  historyLink: {
    alignItems: 'center',
    marginTop: -Metrics.spacing.md,
    marginBottom: Metrics.spacing.xl,
  },
  historyLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.leaf,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
    marginBottom: Metrics.spacing.md,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
  },
  needsCard: {
    backgroundColor: Colors.white,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Metrics.spacing.md,
    marginBottom: Metrics.spacing.md,
  },
  needsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Metrics.spacing.sm,
  },
  needsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Metrics.spacing.sm,
  },
  needChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
    backgroundColor: Colors.muted,
    borderRadius: Metrics.radius.full,
    paddingVertical: Metrics.spacing.xs,
    paddingHorizontal: Metrics.spacing.md,
  },
  needChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
  },
  needsCaption: {
    fontSize: 13,
    color: Colors.mutedForeground,
    lineHeight: 18,
    marginTop: Metrics.spacing.sm,
  },
  mistakesCard: {
    backgroundColor: `${Colors.destructive}0D`,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: `${Colors.destructive}33`,
    padding: Metrics.spacing.md,
    marginBottom: Metrics.spacing.md,
  },
  mistakesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.sm,
  },
  mistakesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.destructive,
    flex: 1,
  },
  mistakeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Metrics.spacing.sm,
    marginTop: Metrics.spacing.sm,
  },
  mistakeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.foreground,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Metrics.spacing.sm,
  },
  curiosityScroll: {
    marginBottom: Metrics.spacing.md,
  },
  curiosityRow: {
    gap: Metrics.spacing.sm,
    paddingRight: Metrics.spacing.lg,
  },
  curiosityCard: {
    width: 220,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    padding: Metrics.spacing.md,
    gap: Metrics.spacing.sm,
  },
  curiosityText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.foreground,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.md,
  },
  benefitTile: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Metrics.spacing.md,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
    marginTop: Metrics.spacing.sm,
  },
  benefitText: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  card: {
    width: '100%',
    marginBottom: Metrics.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
  },
  question: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  answer: {
    fontSize: 13,
    color: Colors.mutedForeground,
    lineHeight: 19,
    marginTop: Metrics.spacing.sm,
    paddingLeft: 40 + Metrics.spacing.sm,
  },
});
